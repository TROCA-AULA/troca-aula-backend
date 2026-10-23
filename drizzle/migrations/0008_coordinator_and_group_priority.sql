CREATE TABLE "UserNetworkLinks" (
	"userId" integer NOT NULL,
	"networkId" integer NOT NULL,
	"approvedAt" timestamp (3),
	"approvedById" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "UserNetworkLinks_userId_networkId_pk" PRIMARY KEY("userId","networkId")
);
--> statement-breakpoint
ALTER TABLE "SchoolTeacherGroups" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "UserNetworkLinks" ADD CONSTRAINT "UserNetworkLinks_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserNetworkLinks" ADD CONSTRAINT "UserNetworkLinks_networkId_Networks_id_fk" FOREIGN KEY ("networkId") REFERENCES "public"."Networks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserNetworkLinks" ADD CONSTRAINT "UserNetworkLinks_approvedById_Users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
-- Perfil novo (id 5). Idempotente por nome, mesmo padrão da 0002: os ids
-- 1-4 já existem, então numa base nova ele nasce com id 5.
INSERT INTO "Profiles" ("name")
SELECT 'COORDENADOR_MUNICIPAL'
WHERE NOT EXISTS (SELECT 1 FROM "Profiles" WHERE "name" = 'COORDENADOR_MUNICIPAL');
--> statement-breakpoint
-- Grupos que já existiam ganham prioridade pela ordem do tempo de espera
-- (menor espera = prioridade 0), por escola — preserva o comportamento atual.
UPDATE "SchoolTeacherGroups" g
SET "priority" = r.rn
FROM (
  SELECT "id", (ROW_NUMBER() OVER (PARTITION BY "schoolId" ORDER BY "delayMinutes", "id") - 1)::int AS rn
  FROM "SchoolTeacherGroups"
) r
WHERE g."id" = r."id";
