import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// O pacote `postgres` usa `export = postgres` (CJS puro) — sem
// `esModuleInterop` no tsconfig deste projeto, `import postgres from
// 'postgres'` compila para `postgres_1.default`, que não existe em runtime
// (o require() já é a própria função). `import ... = require(...)` é a forma
// correta aqui, confirmada rodando a app de fato (não só os testes
// unitários, que mockam o módulo e mascaravam esse erro).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- import = require é a forma correta para o CJS `export = postgres` (ver nota acima)
import postgres = require('postgres');
import * as schema from './schema';

// Substitui PrismaService (ver histórico em prisma/schema.prisma, agora apenas
// referência histórica). Diferença deliberada: o soft delete que antes era
// um middleware global e implícito ($use em prisma.service.ts) agora é
// explícito em cada repository (helper `notDeleted()` em
// src/database/soft-delete.ts) — é mais código repetido, mas nenhuma query
// filtra ou reescreve um delete "por mágica" sem o autor da query ver isso.
//
// `?schema=public` no DATABASE_URL é uma convenção do Prisma, não um
// parâmetro de conexão padrão do Postgres — o driver `postgres` (postgres.js)
// tenta enviá-lo como GUC de sessão no startup packet, e o Postgres rejeita
// com "unrecognized configuration parameter \"schema\"" (achado real, só
// apareceu rodando a app contra o banco de verdade, não nos testes
// unitários mockados). Como o schema é sempre "public" neste projeto — o
// próprio default do Postgres — removemos esse parâmetro antes de conectar,
// em vez de pedir para mudar a DATABASE_URL já em uso pelo Prisma.
export function toPostgresJsConnectionString(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private client!: postgres.Sql;
  private globalDb!: PostgresJsDatabase<typeof schema>;
  // Contexto por request para o RLS (ver RlsContextInterceptor): quando o
  // interceptor reserva uma conexão e seta as GUCs de sessão, `db` passa a
  // apontar para essa conexão durante o request; fora dele, o pool global.
  private readonly als = new AsyncLocalStorage<
    PostgresJsDatabase<typeof schema>
  >();

  onModuleInit(): void {
    this.client = postgres(
      toPostgresJsConnectionString(process.env.DATABASE_URL as string),
    );
    this.globalDb = drizzle(this.client, { schema });
  }

  get db(): PostgresJsDatabase<typeof schema> {
    return this.als.getStore() ?? this.globalDb;
  }

  // O `reserve()` do postgres.js devolve a conexão dedicada, mas não expõe
  // `options` (que o driver do Drizzle ajusta para os parsers de tipo) nem
  // `begin` (transações só existem no client raiz). Este proxy cobre os
  // dois: encaminha `options` do client raiz e implementa `begin` manual
  // com BEGIN/COMMIT/ROLLBACK na própria conexão reservada — mantendo as
  // GUCs de sessão do RLS dentro da transação.
  private scopedClient(reserved: postgres.ReservedSql): postgres.Sql {
    const makeProxy = (target: postgres.ReservedSql): postgres.Sql =>
      new Proxy(target, {
        get: (innerTarget, prop) => {
          if (prop === 'options') {
            return this.client.options;
          }
          if (prop === 'begin') {
            return async (fn: (client: postgres.Sql) => Promise<unknown>) => {
              await target.unsafe('begin');
              try {
                const result = await fn(makeProxy(target));
                await target.unsafe('commit');
                return result;
              } catch (error) {
                await target.unsafe('rollback');
                throw error;
              }
            };
          }
          const value = Reflect.get(innerTarget, prop, innerTarget) as unknown;
          if (typeof value === 'function') {
            return (value as (...args: unknown[]) => unknown).bind(
              target,
            ) as unknown;
          }
          return value;
        },
      });

    return makeProxy(reserved);
  }

  // Roda `fn` com uma conexão DEDICADA, aplicando as GUCs que as políticas
  // de RLS leem (`app.current_network_ids`, `app.is_master`). SET é de
  // sessão (não LOCAL) porque a conexão fica reservada durante todo o
  // request; ao final, reseta e devolve a conexão ao pool. Sem contexto,
  // as políticas de RLS falham fechadas (nenhuma linha) — por isso todo
  // request autenticado passa por aqui (RlsContextInterceptor).
  //
  // Bootstrap: para descobrir QUAIS redes o usuário pode ver, é preciso ler
  // o próprio vínculo (UsersProfilesSchools → Schools), e Schools tem RLS.
  // Por isso a resolução roda com `is_master=true` na MESMA conexão
  // reservada — só para essa consulta de vínculo do próprio usuário — e
  // logo em seguida as GUCs reais são aplicadas para o resto do request.
  async runWithRlsScope<T>(
    resolveScope: () => Promise<{ networkIds: number[]; isMaster: boolean }>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const reserved = await this.client.reserve();
    try {
      const scoped = drizzle(this.scopedClient(reserved), { schema });

      await reserved`select set_config('app.is_master', 'true', false)`;
      const scope = await this.als.run(scoped, resolveScope);

      const ids =
        scope.networkIds.length > 0 ? scope.networkIds.join(',') : '0';
      await reserved`
        select
          set_config('app.current_network_ids', ${ids}, false) as ids,
          set_config('app.is_master', ${scope.isMaster ? 'true' : 'false'}, false) as master
      `;

      return await this.als.run(scoped, fn);
    } finally {
      try {
        await reserved`
          select
            set_config('app.current_network_ids', '0', false),
            set_config('app.is_master', 'false', false)
        `;
      } catch {
        // Se o reset falhar, a conexão é descartada de qualquer forma no
        // release; não mascara o resultado/erro do request.
      }
      reserved.release();
    }
  }

  async onModuleDestroy() {
    await this.client?.end();
  }
}
