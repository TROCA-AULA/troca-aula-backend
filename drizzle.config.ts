import { defineConfig } from 'drizzle-kit';

// Fase 1 da migração Prisma -> Drizzle (docs/design-doc-evolucao-multi-tenant.md,
// ADR-002). Schema idêntico ao anterior (prisma/schema.prisma, mantido como
// referência histórica) — nenhuma tabela/coluna nova nesta fase.
//
// `?schema=public` é convenção do Prisma no DATABASE_URL — não é um
// parâmetro de conexão do Postgres, e drizzle-kit tenta enviá-lo como GUC de
// sessão. Removido aqui pelo mesmo motivo documentado em
// src/database/drizzle.service.ts (duplicado, não importado dali, porque
// este arquivo roda fora do contexto Nest/ts-node, direto no bundler do
// drizzle-kit).
function toPostgresJsConnectionString(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: toPostgresJsConnectionString(process.env.DATABASE_URL as string),
  },
});
