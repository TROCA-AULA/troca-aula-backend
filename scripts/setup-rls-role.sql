-- Papel de APLICAÇÃO para o RLS (ADR-006).
--
-- Por que existe: o RLS do Postgres é ignorado por superusuários e (sem
-- FORCE) pelo dono das tabelas. A app precisa conectar com um papel
-- NOSUPERUSER, que é o que as políticas realmente filtram. Migrations
-- continuam rodando com o papel dono/superusuário (MIGRATION_DATABASE_URL).
--
-- Rode com o papel administrador do banco (ex.):
--   docker exec -i postgres_container psql -U my_user -d troca_aula \
--     -v app_password='SUA_SENHA' -f - < scripts/setup-rls-role.sql
--
-- Em produção, troque a senha e use um cofre/secret manager.

-- Cria o papel (ou atualiza a senha), de forma idempotente.
SELECT format(
  'CREATE ROLE troca_aula_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
  :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'troca_aula_app')
\gexec

SELECT format('ALTER ROLE troca_aula_app PASSWORD %L', :'app_password')
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'troca_aula_app')
\gexec

GRANT USAGE ON SCHEMA public TO troca_aula_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO troca_aula_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO troca_aula_app;

-- Tabelas/sequências criadas por migrations futuras (rodadas pelo dono)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO troca_aula_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO troca_aula_app;
