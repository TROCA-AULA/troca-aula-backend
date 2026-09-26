import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from './drizzle.service';

// `import postgres = require('postgres')` (ver drizzle.service.ts) resolve
// para o require() puro — o mock precisa ser a própria função, sem
// wrapper `default`/`__esModule` (isso só se aplica a `import postgres from
// 'postgres'`, que não é o que o serviço usa).
jest.mock('postgres', () =>
  jest.fn(() => ({ end: jest.fn().mockResolvedValue(undefined) })),
);

jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: jest.fn(() => ({})),
}));

describe('DrizzleService', () => {
  let service: DrizzleService;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrizzleService],
    }).compile();

    service = module.get<DrizzleService>(DrizzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create the client and db on onModuleInit', async () => {
    await service.onModuleInit();
    expect(service.db).toBeDefined();
  });

  it('should close the client on onModuleDestroy', async () => {
    await service.onModuleInit();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});
