import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// O pacote `postgres` usa `export = postgres` (CJS puro) — sem
// `esModuleInterop` no tsconfig deste projeto, `import postgres from
// 'postgres'` compila para `postgres_1.default`, que não existe em runtime
// (o require() já é a própria função). `import ... = require(...)` é a forma
// correta aqui, confirmada rodando a app de fato (não só os testes
// unitários, que mockam o módulo e mascaravam esse erro).
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
  db!: PostgresJsDatabase<typeof schema>;

  async onModuleInit() {
    this.client = postgres(
      toPostgresJsConnectionString(process.env.DATABASE_URL as string),
    );
    this.db = drizzle(this.client, { schema });
  }

  async onModuleDestroy() {
    await this.client?.end();
  }
}
