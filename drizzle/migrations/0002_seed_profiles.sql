-- Achado real ao testar o setup em um banco genuinamente vazio (nunca
-- tocado pelas migrations antigas do Prisma): a migration 0000 (baseline
-- gerada por introspecção na Fase 1) capturou o SCHEMA das tabelas, mas não
-- os dados de seed que duas migrations antigas do Prisma inseriam em
-- "Profiles" (prisma/migrations/20250430004614_insert_profile e
-- 20260818220000_normalize_profile_names, mantidas só como referência
-- histórica, nunca mais executadas). Sem isso, "Profiles" fica vazia numa
-- instalação nova, e todo o sistema de guardas (TenantGuard/RolesGuard,
-- ProfileEnum) depende dessas 4 linhas existirem nos ids 1-4, nessa ordem.
--
-- Idempotente por nome (WHERE NOT EXISTS): roda sem duplicar em bancos que
-- já vêm do histórico antigo do Prisma (onde essas linhas já existem) e
-- semeia do zero em bancos novos, sempre nos ids 1=DIRETOR, 2=AUXILIAR_ADMIN,
-- 3=PROFESSOR, 4=MASTER (ordem que profile.enum.ts assume).
INSERT INTO "Profiles" ("name")
SELECT 'DIRETOR'
WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'DIRETOR');
--> statement-breakpoint
INSERT INTO "Profiles" ("name")
SELECT 'AUXILIAR_ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'AUXILIAR_ADMIN');
--> statement-breakpoint
INSERT INTO "Profiles" ("name")
SELECT 'PROFESSOR'
WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'PROFESSOR');
--> statement-breakpoint
INSERT INTO "Profiles" ("name")
SELECT 'MASTER'
WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'MASTER');
