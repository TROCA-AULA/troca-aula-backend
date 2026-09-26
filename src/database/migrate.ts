// Script standalone para aplicar as migrations do Drizzle (`pnpm db:migrate`),
// equivalente ao antigo `pnpm prisma migrate deploy`. Não é chamado pelo
// NestJS em runtime — roda uma vez, fora do processo da aplicação, por isso
// precisa carregar o `.env` sozinho (o `ConfigModule`/dotenv do Nest só
// entra em ação quando a aplicação sobe via `main.ts`).
import 'dotenv/config';
import 'reflect-metadata';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
// Ver nota em src/database/drizzle.service.ts sobre `export = postgres` sem
// esModuleInterop.
import postgres = require('postgres');
import { toPostgresJsConnectionString } from './drizzle.service';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida');
  }

  const client = postgres(toPostgresJsConnectionString(connectionString), {
    max: 1,
  });
  const db = drizzle(client);

  console.log('Aplicando migrations em drizzle/migrations ...');
  await migrate(db, { migrationsFolder: 'drizzle/migrations' });
  console.log('Migrations aplicadas com sucesso.');

  await client.end();
}

main().catch((error) => {
  console.error('Falha ao aplicar migrations:', error);
  process.exit(1);
});
