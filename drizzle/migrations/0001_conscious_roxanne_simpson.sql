CREATE TABLE "AuditLog" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"networkId" integer NOT NULL,
	"entityType" text NOT NULL,
	"entityId" integer NOT NULL,
	"changedById" integer NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"justification" text,
	"changedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MonthlyClosingReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"schoolId" integer NOT NULL,
	"referenceMonth" text NOT NULL,
	"workloadBreakdown" jsonb NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"reviewedById" integer,
	"reviewedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Editado à mão após o `drizzle-kit generate` (ver docs/design-doc-evolucao-
-- multi-tenant.md, ADR-004): já existem escolas reais no banco sem
-- networkId, então precisamos de uma rede padrão + backfill ANTES de tornar
-- a coluna NOT NULL — o generate sozinho produziria um
-- `ADD COLUMN "networkId" integer NOT NULL` que falharia contra dados
-- existentes. "Rede Padrão" é o destino de qualquer escola pré-existente à
-- introdução do conceito de rede; times reais devem renomeá-la ou migrar
-- escolas para redes próprias depois.
INSERT INTO "Networks" ("name") VALUES ('Rede Padrão');
--> statement-breakpoint
CREATE TABLE "TeacherWorkloadRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"schoolId" integer NOT NULL,
	"networkId" integer NOT NULL,
	"workloadTypeId" integer NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"ataOficialRef" text,
	"validFrom" date NOT NULL,
	"validTo" date,
	"createdById" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkloadPolicies" (
	"id" serial PRIMARY KEY NOT NULL,
	"networkId" integer NOT NULL,
	"workloadTypeId" integer NOT NULL,
	"maxHoursPerWeek" numeric(6, 2),
	"ataOficialRequired" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkloadTypes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
-- Editado à mão: seed das 5 categorias legais fixas de carga horária
-- (Design Doc, Seção 5.3/ADR-003 — catálogo global, sem controller de
-- escrita; só isto aqui semeia as linhas).
INSERT INTO "WorkloadTypes" ("code", "name") VALUES
	('AULA', 'Horas-aula de interação com alunos'),
	('PEDAGOGICO_COLETIVO', 'Trabalho pedagógico coletivo'),
	('LIVRE_ESCOLHA', 'Trabalho pedagógico em local de livre escolha'),
	('SUPLEMENTAR', 'Carga suplementar'),
	('SUBSTITUICAO', 'Aulas de substituição');
--> statement-breakpoint
-- Editado à mão: coluna nullable primeiro, backfill, só então NOT NULL (ver
-- nota acima em "Networks").
ALTER TABLE "Schools" ADD COLUMN "networkId" integer;--> statement-breakpoint
UPDATE "Schools" SET "networkId" = (SELECT "id" FROM "Networks" WHERE "name" = 'Rede Padrão') WHERE "networkId" IS NULL;--> statement-breakpoint
ALTER TABLE "Schools" ALTER COLUMN "networkId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_networkId_Networks_id_fk" FOREIGN KEY ("networkId") REFERENCES "public"."Networks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedById_Users_id_fk" FOREIGN KEY ("changedById") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MonthlyClosingReports" ADD CONSTRAINT "MonthlyClosingReports_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MonthlyClosingReports" ADD CONSTRAINT "MonthlyClosingReports_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MonthlyClosingReports" ADD CONSTRAINT "MonthlyClosingReports_reviewedById_Users_id_fk" FOREIGN KEY ("reviewedById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" ADD CONSTRAINT "TeacherWorkloadRecords_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" ADD CONSTRAINT "TeacherWorkloadRecords_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" ADD CONSTRAINT "TeacherWorkloadRecords_networkId_Networks_id_fk" FOREIGN KEY ("networkId") REFERENCES "public"."Networks"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" ADD CONSTRAINT "TeacherWorkloadRecords_workloadTypeId_WorkloadTypes_id_fk" FOREIGN KEY ("workloadTypeId") REFERENCES "public"."WorkloadTypes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" ADD CONSTRAINT "TeacherWorkloadRecords_createdById_Users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkloadPolicies" ADD CONSTRAINT "WorkloadPolicies_networkId_Networks_id_fk" FOREIGN KEY ("networkId") REFERENCES "public"."Networks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkloadPolicies" ADD CONSTRAINT "WorkloadPolicies_workloadTypeId_WorkloadTypes_id_fk" FOREIGN KEY ("workloadTypeId") REFERENCES "public"."WorkloadTypes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AuditLog_networkId_entityType_entityId_idx" ON "AuditLog" USING btree ("networkId","entityType","entityId");--> statement-breakpoint
CREATE UNIQUE INDEX "MonthlyClosingReports_userId_schoolId_referenceMonth_key" ON "MonthlyClosingReports" USING btree ("userId","schoolId","referenceMonth");--> statement-breakpoint
CREATE INDEX "TeacherWorkloadRecords_schoolId_userId_validFrom_idx" ON "TeacherWorkloadRecords" USING btree ("schoolId","userId","validFrom");--> statement-breakpoint
CREATE INDEX "TeacherWorkloadRecords_networkId_workloadTypeId_idx" ON "TeacherWorkloadRecords" USING btree ("networkId","workloadTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "WorkloadPolicies_networkId_workloadTypeId_key" ON "WorkloadPolicies" USING btree ("networkId","workloadTypeId");--> statement-breakpoint
CREATE INDEX "WorkloadPolicies_networkId_idx" ON "WorkloadPolicies" USING btree ("networkId");--> statement-breakpoint
CREATE UNIQUE INDEX "WorkloadTypes_code_key" ON "WorkloadTypes" USING btree ("code");--> statement-breakpoint
ALTER TABLE "Schools" ADD CONSTRAINT "Schools_networkId_Networks_id_fk" FOREIGN KEY ("networkId") REFERENCES "public"."Networks"("id") ON DELETE restrict ON UPDATE cascade;