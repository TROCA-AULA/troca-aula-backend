-- Normalize legacy Profile names to the canonical identifiers checked by
-- EnrollmentRequestsService.isManagerRole() ('MASTER' | 'DIRETOR' | 'AUXILIAR_ADMIN'),
-- and seed the MASTER profile, which was referenced in code but never inserted
-- by any migration. Without this, approve()/reject() on enrollment requests
-- always throws ForbiddenException for real Diretor/Auxiliar Admin accounts,
-- because profile.name in the DB ('Diretor', 'Auxiliar Administrativo') never
-- matched the uppercase strings the service compares against.
UPDATE "Profiles" SET "name" = 'DIRETOR' WHERE "name" = 'Diretor';
UPDATE "Profiles" SET "name" = 'AUXILIAR_ADMIN' WHERE "name" = 'Auxiliar Administrativo';
UPDATE "Profiles" SET "name" = 'PROFESSOR' WHERE "name" = 'Professor';

-- The original seed migration inserted explicit ids (1,2,3) without advancing
-- the "id" sequence, so a plain INSERT relying on the default would collide
-- with id=1. Advance it to the current max id before inserting MASTER.
SELECT setval(pg_get_serial_sequence('"Profiles"', 'id'), COALESCE((SELECT MAX(id) FROM "Profiles"), 1));

INSERT INTO "Profiles" ("name")
SELECT 'MASTER'
WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'MASTER');
