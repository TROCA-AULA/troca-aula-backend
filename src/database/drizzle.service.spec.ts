/* eslint-disable @typescript-eslint/require-await -- mocks assíncronos precisam da assinatura `async` para devolver Promise (contrato do postgres.js), mesmo sem await real */
import { Test, TestingModule } from '@nestjs/testing';
import {
  DrizzleService,
  toPostgresJsConnectionString,
} from './drizzle.service';

// `import postgres = require('postgres')` (ver drizzle.service.ts) resolve
// para o require() puro — o mock precisa ser a própria função, sem
// wrapper `default`/`__esModule` (isso só se aplica a `import postgres from
// 'postgres'`, que não é o que o serviço usa).
//
// O client fake expõe o que o serviço usa:
// - `reserve()` → função "tagged template" (usada em
//   reserved`select set_config(...)`) com `.unsafe`/`.release` anexados;
// - `options` (encaminhado pelo proxy interno de scopedClient);
// - `end()` (usado em onModuleDestroy).
const mockReserved = Object.assign(
  jest.fn(async (..._args: unknown[]) => []),
  {
    unsafe: jest.fn(async (..._args: unknown[]) => []),
    release: jest.fn(),
  },
);

const mockClient = {
  end: jest.fn(async () => undefined),
  reserve: jest.fn(async () => mockReserved),
  options: { parsers: { fake: true } },
};

// As factories são executadas no require() (antes das consts acima), então as
// referências a `mockClient`/`mockDrizzle` são lidas de forma preguiçosa —
// só quando o serviço chama as funções, já dentro dos testes.
jest.mock('postgres', () => jest.fn(() => mockClient));

const mockDrizzle = jest.fn((client: unknown, config: unknown) => ({
  $client: client,
  $config: config,
}));

jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: (client: unknown, config: unknown) => mockDrizzle(client, config),
}));

const postgresMock = jest.requireMock('postgres');

// Texto do template da chamada N em mockReserved (o primeiro argumento de uma
// tagged template é o array de strings).
const tagCallText = (index: number): string =>
  (mockReserved.mock.calls[index][0] as string[]).join('${}');

// Valores interpolados da chamada N (tudo depois do array de strings).
const tagCallValues = (index: number): unknown[] =>
  mockReserved.mock.calls[index].slice(1);

describe('DrizzleService', () => {
  let service: DrizzleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReserved.mockResolvedValue([]);
    mockReserved.unsafe.mockResolvedValue([]);
    mockClient.reserve.mockResolvedValue(mockReserved);

    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrizzleService],
    }).compile();

    service = module.get<DrizzleService>(DrizzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toPostgresJsConnectionString', () => {
    it('removes o parâmetro ?schema (convenção do Prisma)', () => {
      expect(
        toPostgresJsConnectionString(
          'postgresql://user:pass@localhost:5432/db?schema=public',
        ),
      ).toBe('postgresql://user:pass@localhost:5432/db');
    });

    it('mantém os demais parâmetros de conexão', () => {
      expect(
        toPostgresJsConnectionString(
          'postgresql://user:pass@localhost:5432/db?sslmode=require',
        ),
      ).toBe('postgresql://user:pass@localhost:5432/db?sslmode=require');
    });
  });

  describe('onModuleInit/onModuleDestroy', () => {
    it('cria o client postgres e o db global no onModuleInit', () => {
      service.onModuleInit();

      expect(postgresMock).toHaveBeenCalledWith(
        'postgresql://user:pass@localhost:5432/db',
      );
      expect(mockDrizzle).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({ schema: expect.anything() }),
      );
      expect(service.db).toBe(mockDrizzle.mock.results[0].value);
    });

    it('remove o ?schema=public da DATABASE_URL antes de conectar', () => {
      process.env.DATABASE_URL =
        'postgresql://user:pass@localhost:5432/db?schema=public';

      service.onModuleInit();

      expect(postgresMock).toHaveBeenCalledWith(
        'postgresql://user:pass@localhost:5432/db',
      );
    });

    it('fecha o client no onModuleDestroy', async () => {
      service.onModuleInit();

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      expect(mockClient.end).toHaveBeenCalledTimes(1);
    });

    it('não quebra no onModuleDestroy antes do onModuleInit', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      expect(mockClient.end).not.toHaveBeenCalled();
    });
  });

  describe('runWithRlsScope', () => {
    it('aplica bootstrap, GUCs do escopo, roda fn e faz reset + release', async () => {
      service.onModuleInit();
      const resolveScope = jest.fn(async () => ({
        networkIds: [1, 2],
        isMaster: true,
      }));
      const fn = jest.fn(async () => 'result');

      await expect(service.runWithRlsScope(resolveScope, fn)).resolves.toBe(
        'result',
      );

      expect(resolveScope).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(1);

      // 1) Bootstrap: is_master=true para ler o próprio vínculo (Schools tem RLS).
      expect(tagCallText(0)).toContain(
        "set_config('app.is_master', 'true', false)",
      );
      expect(tagCallValues(0)).toEqual([]);

      // 2) GUCs reais do request.
      expect(tagCallText(1)).toContain('app.current_network_ids');
      expect(tagCallValues(1)).toEqual(['1,2', 'true']);

      // 3) Reset das GUCs no finally (sem interpolação).
      expect(tagCallText(2)).toContain(
        "set_config('app.current_network_ids', '0', false)",
      );
      expect(tagCallText(2)).toContain(
        "set_config('app.is_master', 'false', false)",
      );
      expect(tagCallValues(2)).toEqual([]);

      expect(mockReserved.release).toHaveBeenCalledTimes(1);
    });

    it('expõe o db do escopo dentro de resolveScope/fn e o global fora', async () => {
      service.onModuleInit();
      const globalDb = service.db;
      let dbInResolve: unknown;
      let dbInFn: unknown;

      await service.runWithRlsScope(
        async () => {
          dbInResolve = service.db;
          return { networkIds: [5], isMaster: false };
        },
        async () => {
          dbInFn = service.db;
          return 'ok';
        },
      );

      const scopedDb = mockDrizzle.mock.results[1].value;
      expect(dbInResolve).toBe(scopedDb);
      expect(dbInFn).toBe(scopedDb);
      expect(scopedDb).not.toBe(globalDb);
      expect(service.db).toBe(globalDb);
      expect(mockReserved.release).toHaveBeenCalledTimes(1);
    });

    it("usa '0' quando não há network ids e isMaster=false", async () => {
      service.onModuleInit();

      await expect(
        service.runWithRlsScope(
          async () => ({ networkIds: [], isMaster: false }),
          async () => 'ok',
        ),
      ).resolves.toBe('ok');

      expect(tagCallValues(1)).toEqual(['0', 'false']);
    });

    it('não mascara o resultado quando o reset das GUCs falha', async () => {
      service.onModuleInit();
      let tagCalls = 0;
      mockReserved.mockImplementation(async () => {
        tagCalls += 1;
        if (tagCalls === 3) {
          throw new Error('reset failed');
        }
        return [];
      });

      await expect(
        service.runWithRlsScope(
          async () => ({ networkIds: [9], isMaster: true }),
          async () => 'result',
        ),
      ).resolves.toBe('result');

      expect(tagCalls).toBe(3);
      expect(mockReserved.release).toHaveBeenCalledTimes(1);
    });

    it('propaga erro de fn após resetar as GUCs e liberar a conexão', async () => {
      service.onModuleInit();

      await expect(
        service.runWithRlsScope(
          async () => ({ networkIds: [7], isMaster: false }),
          async () => {
            throw new Error('request failed');
          },
        ),
      ).rejects.toThrow('request failed');

      expect(mockReserved.mock.calls).toHaveLength(3);
      expect(tagCallValues(1)).toEqual(['7', 'false']);
      expect(tagCallValues(2)).toEqual([]);
      expect(mockReserved.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('scopedClient (proxy interno)', () => {
    const runInScope = (fn: () => Promise<unknown>) =>
      service.runWithRlsScope(
        async () => ({ networkIds: [1], isMaster: true }),
        fn,
      );

    it('encaminha options do client raiz e repassa propriedades simples', async () => {
      service.onModuleInit();
      (mockReserved as unknown as Record<string, unknown>).plainProp =
        'plain-value';

      let proxy: Record<string, any> | undefined;
      await runInScope(async () => {
        proxy = (service.db as unknown as { $client: Record<string, any> })
          .$client;
        return 'ok';
      });

      expect(proxy?.options).toBe(mockClient.options);
      expect(proxy?.plainProp).toBe('plain-value');
    });

    it('faz bind das funções na conexão reservada', async () => {
      service.onModuleInit();

      let proxy: Record<string, any> | undefined;
      await runInScope(async () => {
        proxy = (service.db as unknown as { $client: Record<string, any> })
          .$client;
        return 'ok';
      });

      mockReserved.unsafe.mockClear();
      await proxy?.unsafe('select 1');
      expect(mockReserved.unsafe).toHaveBeenCalledWith('select 1');
    });

    it('begin: faz begin/commit e passa o proxy para o callback', async () => {
      service.onModuleInit();

      let txOptions: unknown;
      let result: number | undefined;
      await runInScope(async () => {
        const proxy = (
          service.db as unknown as { $client: Record<string, any> }
        ).$client;
        result = await proxy.begin(async (tx: Record<string, any>) => {
          txOptions = tx.options;
          return 42;
        });
        return 'ok';
      });

      expect(result).toBe(42);
      expect(txOptions).toBe(mockClient.options);
      expect(mockReserved.unsafe).toHaveBeenCalledWith('begin');
      expect(mockReserved.unsafe).toHaveBeenCalledWith('commit');
      expect(mockReserved.unsafe).not.toHaveBeenCalledWith('rollback');
    });

    it('begin: faz rollback e relança quando o callback falha', async () => {
      service.onModuleInit();

      await expect(
        runInScope(async () => {
          const proxy = (
            service.db as unknown as { $client: Record<string, any> }
          ).$client;
          return proxy.begin(async () => {
            throw new Error('tx failed');
          });
        }),
      ).rejects.toThrow('tx failed');

      expect(mockReserved.unsafe).toHaveBeenCalledWith('begin');
      expect(mockReserved.unsafe).toHaveBeenCalledWith('rollback');
      expect(mockReserved.unsafe).not.toHaveBeenCalledWith('commit');
      expect(mockReserved.release).toHaveBeenCalledTimes(1);
    });
  });
});
