-- CÓPIA de docs/guias-de-teste/sql/01-base-producao.sql (repositório raiz),
-- usada pelo CI (job "API com banco real"). Ao mudar uma, mude a outra.
-- =============================================================================
--  Troca Aula — SQL BASE (o mínimo para o sistema funcionar "como em produção")
-- =============================================================================
--
--  QUANDO RODAR: uma única vez, logo depois de `pnpm run db:migrate`, num
--  banco novo. Pode rodar de novo sem medo: tudo aqui é idempotente (não
--  duplica nada se já existir).
--
--  POR QUE ISTO EXISTE: o sistema tem um "problema do ovo e da galinha" de
--  propósito. Para dar um perfil a alguém (POST /users/:id/assign-profile),
--  quem pede precisa JÁ ser gestor da escola. Então o primeiro administrador
--  (MASTER) não pode nascer pela tela nem pela API — ele nasce aqui, direto
--  no banco. Isso é uma regra de segurança, não um defeito.
--
--  COMO RODAR (de dentro da pasta troca-aula-backend):
--    docker exec -i postgres_container psql -U my_user -d troca_aula \
--      -v ON_ERROR_STOP=1 -f - < ../docs/guias-de-teste/sql/01-base-producao.sql
--
--  Rode com o usuário DONO do banco (my_user), não com troca_aula_app: o
--  troca_aula_app está sujeito ao RLS e não enxergaria as tabelas protegidas.
--
--  O QUE ESTE ARQUIVO CRIA:
--    1. Confere os 4 perfis (as migrations já criam; aqui só garante).
--    2. Confere a "Rede Padrão" (id 1) e os 5 tipos de carga horária.
--    3. Uma escola técnica "Administração da Plataforma", onde o MASTER fica
--       vinculado (todo vínculo precisa de uma escola).
--    4. O usuário MASTER:
--         e-mail: master@trocaaula.local
--         senha : Trocar@123      ← TROQUE no primeiro acesso (/alterar-senha)
--    5. Um catálogo inicial de disciplinas (BNCC, ensino fundamental).
-- =============================================================================

BEGIN;

-- 1. Perfis — a ORDEM dos ids importa: o código assume 1..5 exatamente assim.
--    (As migrations já criam os cinco; isto só garante, caso falte algum.)
INSERT INTO "Profiles" ("name") SELECT 'DIRETOR'
  WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'DIRETOR');
INSERT INTO "Profiles" ("name") SELECT 'AUXILIAR_ADMIN'
  WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'AUXILIAR_ADMIN');
INSERT INTO "Profiles" ("name") SELECT 'PROFESSOR'
  WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'PROFESSOR');
INSERT INTO "Profiles" ("name") SELECT 'MASTER'
  WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'MASTER');
INSERT INTO "Profiles" ("name") SELECT 'COORDENADOR_MUNICIPAL'
  WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'COORDENADOR_MUNICIPAL');

-- 2. Rede padrão e tipos de carga horária (as migrations já criam).
INSERT INTO "Networks" ("name") SELECT 'Rede Padrão'
  WHERE NOT EXISTS (SELECT 1 FROM "Networks");

INSERT INTO "WorkloadTypes" ("code", "name") VALUES
  ('AULA',                'Horas-aula de interação com alunos'),
  ('PEDAGOGICO_COLETIVO', 'Trabalho pedagógico coletivo'),
  ('LIVRE_ESCOLHA',       'Trabalho pedagógico em local de livre escolha'),
  ('SUPLEMENTAR',         'Carga suplementar'),
  ('SUBSTITUICAO',        'Aulas de substituição')
ON CONFLICT ("code") DO NOTHING;

-- 3. Escola técnica para o vínculo do MASTER.
INSERT INTO "Schools" ("name", "networkId")
SELECT 'Administração da Plataforma', (SELECT MIN("id") FROM "Networks")
WHERE NOT EXISTS (
  SELECT 1 FROM "Schools" WHERE "name" = 'Administração da Plataforma'
);

-- 4. Usuário MASTER. A senha é guardada como hash bcrypt (nunca em texto).
--    Hash abaixo = "Trocar@123".
INSERT INTO "Users" ("name", "email", "phone", "password")
VALUES (
  'Administrador Master',
  'master@trocaaula.local',
  '00000000000',
  '$2b$10$ddEUW8Q37Gyzcxkh5pnQ4uDA/WrmKlKRI3IhJ5/k0FP1HUy7gUw6S'
)
ON CONFLICT ("email") DO NOTHING;

-- Vínculo MASTER (perfil 4) já APROVADO (approvedAt preenchido). Sem
-- approvedAt o vínculo existe mas não dá acesso nenhum.
INSERT INTO "UsersProfilesSchools" ("userId", "profileId", "schoolId", "approvedAt")
SELECT u."id", 4, s."id", NOW()
FROM "Users" u, "Schools" s
WHERE u."email" = 'master@trocaaula.local'
  AND s."name" = 'Administração da Plataforma'
ON CONFLICT DO NOTHING;

-- 5. Catálogo inicial de disciplinas (ajuste à realidade da rede).
INSERT INTO "Subjects" ("name")
SELECT nome FROM (VALUES
  ('Língua Portuguesa'), ('Matemática'), ('Ciências'), ('História'),
  ('Geografia'), ('Arte'), ('Educação Física'), ('Língua Inglesa')
) AS d(nome)
WHERE NOT EXISTS (SELECT 1 FROM "Subjects" s WHERE s."name" = d.nome);

COMMIT;

-- Conferência rápida (o resultado aparece na tela):
SELECT 'perfis'      AS item, COUNT(*) AS total FROM "Profiles"
UNION ALL SELECT 'redes',       COUNT(*) FROM "Networks"
UNION ALL SELECT 'tipos de carga', COUNT(*) FROM "WorkloadTypes"
UNION ALL SELECT 'disciplinas', COUNT(*) FROM "Subjects" WHERE "deletedAt" IS NULL
UNION ALL SELECT 'masters ativos', COUNT(*) FROM "UsersProfilesSchools"
  WHERE "profileId" = 4 AND "approvedAt" IS NOT NULL;
-- Esperado: perfis 4 · redes ≥ 1 · tipos de carga 5 · disciplinas ≥ 8 · masters ativos ≥ 1
