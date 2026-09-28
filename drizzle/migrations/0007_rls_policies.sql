-- RLS (Row-Level Security) — ADR-006 revisado: ativado com sessão por
-- request (DrizzleService.runWithRlsScope + RlsContextInterceptor), que
-- reserva uma conexão por request e seta as GUCs de sessão abaixo.
--
-- Leitura das GUCs:
--   app.current_network_ids — lista separada por vírgula das redes dos
--     vínculos aprovados do usuário (ex.: '1,4'); '0' quando não há rede.
--   app.is_master — 'true' para MASTER (acesso global, Design Doc).
--
-- Fail-closed: sem as GUCs (ex.: query fora de request autenticado), as
-- expressões resultam NULL/false e NENHUMA linha é retornada. FORCE ROW
-- LEVEL SECURITY garante que o próprio dono das tabelas (usuário da app)
-- também esteja sujeito às políticas.
--
-- Escopo: apenas as tabelas que JÁ têm a coluna networkId (ADR-005) —
-- Networks, Schools, WorkloadPolicies, TeacherWorkloadRecords e AuditLog.
-- Classes/EnrollmentRequest/UsersProfilesSchools não têm a coluna e
-- continuam isoladas pelos guards + escopo explícito das queries
-- (documentado no Design Doc).

ALTER TABLE "Networks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "Networks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "Schools" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "Schools" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "WorkloadPolicies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "WorkloadPolicies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "TeacherWorkloadRecords" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "rls_networks_scope" ON "Networks" FOR ALL
  USING (
    current_setting('app.is_master', true) = 'true'
    OR "id" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  )
  WITH CHECK (
    current_setting('app.is_master', true) = 'true'
    OR "id" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  );
--> statement-breakpoint
CREATE POLICY "rls_schools_scope" ON "Schools" FOR ALL
  USING (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  )
  WITH CHECK (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  );
--> statement-breakpoint
CREATE POLICY "rls_workload_policies_scope" ON "WorkloadPolicies" FOR ALL
  USING (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  )
  WITH CHECK (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  );
--> statement-breakpoint
CREATE POLICY "rls_teacher_workload_records_scope" ON "TeacherWorkloadRecords" FOR ALL
  USING (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  )
  WITH CHECK (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  );
--> statement-breakpoint
CREATE POLICY "rls_audit_log_scope" ON "AuditLog" FOR ALL
  USING (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  )
  WITH CHECK (
    current_setting('app.is_master', true) = 'true'
    OR "networkId" = ANY (
      string_to_array(
        NULLIF(current_setting('app.current_network_ids', true), ''),
        ','
      )::int[]
    )
  );
