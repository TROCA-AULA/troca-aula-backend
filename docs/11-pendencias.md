# Pendências de Desenvolvimento

Este documento lista as funcionalidades que ainda não foram implementadas no backend, identificadas durante a análise do código e comparação com a documentação.

> **Fonte única de status (verificada em 2026-10-22 rodando o sistema):** [`docs/status-funcionalidades.md`](../../docs/status-funcionalidades.md) — lista o que funciona, os **defeitos encontrados (D1–D24, todos corrigidos)**, o que está pendente e o que está fora de escopo. Este arquivo guarda o histórico técnico das fases.
>
> **Ver também:** [`design-doc-evolucao-multi-tenant.md`](../../docs/design-doc-evolucao-multi-tenant.md) (raiz do projeto) — arquitetura completa da evolução multi-tenant, migração Prisma→Drizzle e conformidade municipal.
>
> **Atualização (Fases 0-5 + P15 + MonthlyClosingReports + e-mail):** segurança/autorização (Fase 0), migração Prisma→Drizzle (Fase 1), modelo de dados multi-tenant com conformidade de carga horária (Fase 2), frontend multi-tenant (Fase 3), indicador estatístico (Fase 4, backend + tela de indicadores no frontend), fluxo de senha (troca pelo próprio usuário e reset por gestor), `networkId` por vínculo no JWT, relatório mensal de fechamento de ponto — incluindo o fluxo de correção (`reopen`) — e a **Fase 5 (motor de elegibilidade geográfica, ver seção própria abaixo)** estão implementados e commitados na branch `v2` (backend **594 testes, 61 suítes + 7 E2E, 0 falhas**, cobertura de 98,7% de linhas / 92,9% de branches — mínimo de 90% exigido no CI). Notificações por e-mail (nodemailer) implementadas de forma opcional: sem `SMTP_HOST`, o serviço vira no-op (não quebra dev/CI). RLS **ativado** na rodada de segurança (sessão por request; ver seção própria abaixo e ADR-006 revisado). Segue pendente: perfil `COORDENADOR_MUNICIPAL`/vínculo usuário↔rede (fora do recorte da Fase 5 nesta rodada), push notifications (app mobile) e ML/NLP/dashboard analítico (WON'T).
>
> **P15 (achado durante a Fase 3, corrigido nesta rodada):** `GET /users` ganhou filtros opcionais `schoolId`/`profileId`; novo endpoint `POST /users/:id/unassign-profile` (contraparte de `assign-profile`). Bug adicional corrigido: `assign-profile` nunca setava `approvedAt`/`approvedById`, então o vínculo criado nunca era considerado aprovado — o endpoint não concedia acesso nenhum na prática. Validado end-to-end contra Postgres real (criar → vincular → listar filtrado → desvincular → confirmar sumiço).
>
> **Fase 4 (indicador estatístico, prioridade COULD):** `GET /classes/coverage-stats?schoolId=&subjectId=&dayOfWeek=` — taxa histórica de cobertura de aulas vagas (`available=false`) no recorte informado, com nível de risco (`baixo`/`medio`/`alto`, cortes em 0,7/0,4). Sem tabela nova, sem job. Protegido por `TenantGuard` quando `schoolId` é informado. Validado end-to-end contra Postgres real e via `TenantGuard` (outsider sem vínculo recebe 403).
>
> **Fase 5 (motor de elegibilidade geográfica — Design Doc Seção 9), no modelo de GRUPOS definido com o stakeholder:** tabelas novas `SchoolTeacherGroups` (grupos por escola: nome + delay), `ProfessorSchoolGroups` (classificação), `NetworkInterconnections` (direcional), `ProfessorNetworkInterests` e `ProfessorSchoolExclusions`; `Schools` ganhou `ungroupedDelayMinutes` (espera de quem não está em grupo) e `acceptedNetworkIds` (a escola só restringe MAIS que o município). `EligibilityService`: exclusão do professor vence tudo; a regra do município decide se a rede pode ver a vaga; quem está em um grupo vê após o delay do grupo (menor delay se estiver em vários), fora de grupo após o delay padrão; escolas sem grupos mantêm o fallback de `priorityWindowHours`. Usado na listagem (`ClassesService.findAll`, em lote) e na candidatura (`EnrollmentRequestsService.create`). Endpoints: `GET/POST/PATCH/DELETE /schools/:id/teacher-groups`, `PUT /schools/:id/teacher-groups/:groupId/members`, `PATCH /schools/:id/priority-settings`, `GET/PUT /networks/:id/interconnections` (MASTER), `GET/POST/DELETE /professor-preferences`. Migrations `0005`/`0006` aplicadas no Postgres local; o modelo anterior de tiers (`SchoolPriorityTiers`) foi removido. **Fora do recorte:** perfil `COORDENADOR_MUNICIPAL` e vínculo usuário↔rede. Validado end-to-end contra Postgres real (grupo com delay 0 vê; sem grupo recebe o tempo de espera; fora da regra do município recebe 403 específico; escola recebe 400 ao aceitar rede não interconectada; MASTER lê interconexões).
>
> **E-mail (roadmap):** `EmailService` (nodemailer) com `SMTP_*` opcional — no-op logado sem `SMTP_HOST`, nunca lança. Dispara em aprovação/rejeição de candidatura e em nova aula vaga (professores da matéria vinculados à escola). `SMTP_*` documentado no `.env.example`.

---

## Pendências Identificadas

### Backend - Funcionalidades Implementadas

| Item | Status | Observação |
|------|--------|------------|
| P1 - Controle de Limite de Substituições | ✅ Implementado (com ressalva) | O gate usa `Users.substitutionLimitPerSemester` (limite **por professor**, contando aprovações do semestre). A coluna homônima em `Schools` existe mas **não é usada**. Não há tela nem rota para definir o limite (defeito D6) — só via banco |
| P2 - Integração Gov.br | ⏸️ Só stub (não autentica) | `GET /auth/govbr-auth-url` responde 501 e `POST /auth/login-govbr` responde 401, ambos "em desenvolvimento". O front tem o botão e a rota de sessão prontos, mas o login Gov.br **não funciona** |

### Segurança/Autorização — Fase 0 do Design Doc (multi-tenant)

| Item | Status | Observação |
|------|--------|------------|
| P3 - `assign-profile` sem checagem de escopo | ✅ Corrigido | `POST /users/:id/assign-profile` agora exige `TenantGuard` (vínculo aprovado na escola do `schoolId` informado) + `RolesGuard(MASTER, DIRETOR, AUXILIAR_ADMIN)` |
| P4 - `SubjectsController`/`POST /users` públicos | ✅ Corrigido (Subjects) / Mantido (Users) | Mutações de `SubjectsController` agora exigem `RolesGuard(MASTER)`; leitura continua pública. `POST /users` permanece público por design (fluxo de auto-cadastro, confirmado em `docs/tutorial-teste-local-fluxos.md`) |
| P5 - `SchoolsController`/`ClassesController` sem checagem de perfil/escola | ✅ Corrigido | Mutações de `SchoolsController` exigem `RolesGuard(MASTER)`; `ClassesController.create` exige `TenantGuard`+`RolesGuard`; `update`/`remove` validam a escola da aula no `ClassesService` (`hasSchoolAccess`) |
| P6 - Duas lógicas de autorização divergentes | ✅ Corrigido | `classes.service.ts` e `enrollment-requests.service.ts` agora usam a mesma fonte de verdade: `TenantContextService` (`src/modules/auth/tenant/tenant-context.service.ts`) |
| P7 - `enum ProfileEnum` desatualizado | ✅ Corrigido | `MASTER = 4` adicionado, confirmado contra a migration `20260818220000_normalize_profile_names` |

**Como validar (números daquela rodada — hoje são 594 testes em 61 suítes + 7 E2E):** `npx tsc --noEmit` e `pnpm test` (**263/263 testes, 33 suítes, 0 falhas** — as 7 falhas pré-existentes de `profile.controller.spec.ts`/`create-user.dto.spec.ts` foram corrigidas). Novos testes dedicados em `src/modules/auth/tenant/tenant-context.service.spec.ts`, `src/modules/auth/guards/{tenant,roles}.guard.spec.ts`, nos specs de `users` (assign/unassign-profile, filtros de `findAll`) e nos specs de `classes` (`getCoverageStats`/`getCoverageCounts`).

### Ciência de Dados — Fase 4 do Design Doc (COULD, prioridade baixa)

| Item | Status | Observação |
|------|--------|------------|
| Indicador estatístico de risco de aula vaga | ✅ Implementado | `GET /classes/coverage-stats?schoolId=&subjectId=&dayOfWeek=` (todos os filtros opcionais). Retorna `{ totalVagas, cobertas, taxaCobertura, nivel }`; `nivel` é heurística simples (≥0,7 baixo · 0,4-0,7 médio · <0,4 alto; sem dado = alto por precaução), documentada em `src/modules/classes/interfaces/coverage-stats.interface.ts`. Sem tabela nova, sem job — agregação direta sobre `Classes` existente. Protegido por `TenantGuard` quando `schoolId` é informado. |
| Frontend do indicador | ✅ Feito | Tela de indicadores consome `GET /classes/coverage-stats` no `troca-aula-front` (implementada após o backend). |
| ML preditivo / NLP / dashboard analítico completo | ❌ Não implementado (WON'T) | Visão de futuro registrada no Design Doc, fora do roadmap comprometido deste ciclo. |

---

## Para Desenvolvimento do Frontend

**Consulte o prompt completo em**: `docs/prompt.front.md`

Esse documento contém:
- Visão geral do projeto
- Stack técnico do backend
- Todos os contratos de API disponíveis
- Headers necessários
- Response format padrão
- Tarefa: criar/atualizar pendências do frontend

---

## Funcionalidades Já Implementadas

O backend já conta com as seguintes funcionalidades:

### Autenticação e Autorização
- Login JWT com bcrypt ✅
- Fallback lazy para o hash legado (SHA1+bcrypt), com migração no primeiro login bem-sucedido ✅
- `networkId` por vínculo escola/perfil no payload do JWT ✅
- Troca de senha pelo próprio usuário (`PATCH /auth/change-password`) ✅
- Reset de senha por gestor (`POST /users/:id/reset-password`; MASTER ou gestor de escola compartilhada) ✅
- Guards para rotas autenticadas (AuthGuard, TenantGuard, RolesGuard) ✅
- Validação de perfil (MASTER, DIRETOR, AUXILIAR_ADMIN, PROFESSOR) ✅

### Módulos CRUD
- Users (usuários) ✅
- Schools (escolas) ✅
- Subjects (disciplinas) ✅
- Classes (aulas) ✅
- Profile (perfis) ✅
- Networks (redes) ✅
- WorkloadPolicies (políticas de carga horária) ✅
- TeacherWorkloadRecords (jornada docente) ✅
- MonthlyClosingReports (fechamento mensal, incl. `reopen`) ✅
- AuditLog (leitura por rede/entidade, MASTER-only) ✅

### Funcionalidades de Negócio
- Criação de aulas vagas ✅
- Sistema de candidaturas ✅
- Aprovação/rejeição de candidaturas ✅
- Verificação de conflito de horário ✅
- Verificação de habilitação por matéria ✅
- Verificação de disponibilidade de aula ✅
- Controle de limite de substituições (`GET /enrollment-requests/substitution-limit/:professorId`) ✅
- Verificação do teto de jornada docente via WorkloadPolicies ✅
- Controle de permissões por perfil ✅

---

## Recomendações

As sugestões de implementação que ficavam aqui (código Prisma para P1 e P2) eram de antes da migração para Drizzle e foram removidas por estarem obsoletas: P1 está implementado; P2 continua como stub (ver tabela acima e `docs/status-funcionalidades.md`, Seção 3).

---

## Status Geral (Backend)

| Item | Status |
|------|--------|
| Módulos principais | ✅ Completo |
| Endpoints CRUD | ✅ Completo |
| Sistema de candidaturas | ✅ Completo |
| Controle de limite de substituições | ✅ Implementado |
| Integração Gov.br | ⏸️ Só stub — não autentica |
| Documentação API | ✅ Sincronizada (README + `docs/01`/`02`/`03`/`04`) — ver nota abaixo |
| Guarda de tenant/perfil centralizada | ✅ Implementada (Fase 0) — ver P3-P7 acima |
| Migração Prisma → Drizzle | ✅ Implementada (Fase 1) — ver nota técnica abaixo |
| Modelo multi-tenant (`Networks`, `WorkloadPolicies`, `TeacherWorkloadRecords`, `AuditLog`) | ✅ Implementado (Fase 2) — ver nota técnica abaixo |
| `MonthlyClosingReports` (relatório mensal de fechamento) | ✅ Implementado — ver seção "Fase 2b" abaixo |
| RLS (Row-Level Security) | ✅ Ativado na rodada de segurança — ver ADR-006 revisado |
| Correção do contrato quebrado de vínculo de professores (P15) | ✅ Implementado — `unassign-profile` + filtros em `GET /users` |
| Indicador estatístico de risco de aula vaga (Fase 4) | ✅ Implementado — `GET /classes/coverage-stats` (backend + frontend), ver seção "Ciência de Dados" acima |
| `networkId` por vínculo no JWT | ✅ Implementado — `AuthService.signIn` + `UsersRepository.findOneBy` |
| Fluxo de senha (troca pelo próprio usuário + reset por gestor) | ✅ Implementado — `PATCH /auth/change-password`, `POST /users/:id/reset-password` |
| Fluxo de correção do fechamento mensal (`reopen`) | ✅ Implementado — `PATCH /monthly-closing-reports/:id/reopen`, justificativa obrigatória e auditada |

### Pendências Remanescentes (reais) — atualizado em 2026-10-23

| Item | Status | Observação |
|------|--------|------------|
| RLS (Row-Level Security) | ✅ Ativado | Sessão por request (`runWithRlsScope` + interceptor) e políticas `FORCE ROW LEVEL SECURITY` nas 5 tabelas com `networkId` (migration 0007); app conecta como papel NOSUPERUSER. Leituras de diretório (escolas/redes) que precisam atravessar redes usam `DrizzleService.runPrivileged` — corrigiu a elegibilidade de professores de outra rede (D4) e a tela de preferências (D5) |
| Fase 5 — motor de elegibilidade geográfica | ✅ Implementada | Grupos **com prioridade** (0 recebe primeiro); sem grupo = último; escola sem grupos = todos na hora. Substitui o ranking por antiguidade e o `priorityWindowHours` (rota removida; a coluna ficou no banco sem uso) |
| E-mail | ✅ Implementado (opcional, via `SMTP_*`) | Aprovação/rejeição (com o motivo), nova vaga e **senha temporária** (`reset-password` envia e responde `emailSent`; o front usa o mesmo caminho ao criar contas). Sem SMTP, a senha volta na resposta para o gestor repassar |
| Testes E2E | ✅ | `test/app.e2e-spec.ts` (7 E2E de *wiring*, sem banco) + roteiro `test/api/testar-api.sh` (222 verificações com Postgres real e RLS), que roda no CI no job `api-real-db` |
| Defeitos D1–D24 | ✅ Todos corrigidos | Ver `docs/status-funcionalidades.md`, Seção 2 |
| Cidade de residência do professor | ✅ Implementada | `Users.residenceNetworkId` (migration 0009). Só vale para quem não tem vínculo aprovado com escola (contrato prevalece) |
| Perfil `COORDENADOR_MUNICIPAL` / vínculo usuário↔rede | ✅ Implementado | Tabela `UserNetworkLinks`, rotas `/network-coordinators` (MASTER). O coordenador gere escolas, políticas, interconexões e auditoria da sua rede e opera cada escola como diretor |
| ML preditivo / NLP / dashboard analítico completo | ❌ WON'T | Visão de futuro do Design Doc, fora do roadmap comprometido deste ciclo |

### Fase 1 — Migração Prisma → Drizzle (implementada)

- **Driver Postgres:** `postgres` (postgres.js), com `drizzle-orm/postgres-js`. Schema traduzido 1:1 de `prisma/schema.prisma` para `src/database/schema.ts` (mesmas 7 tabelas, mesmos nomes de tabela/coluna — confirmado contra o banco real via `\d "Tabela"`, não só contra o `.prisma`).
- **Baseline de migrations:** gerada com `drizzle-kit generate` (`drizzle/migrations/0000_sloppy_dorian_gray.sql`) e registrada manualmente em `drizzle.__drizzle_migrations` (schema/hash/timestamp calculados como o runtime `migrate()` do Drizzle faria) **sem reexecutar o DDL**, já que as tabelas já existiam (criadas pelas 11 migrations do Prisma). Validado rodando `migrate()` de verdade contra o banco local: não tentou recriar nenhuma tabela.
- **Soft delete:** antes era middleware implícito do Prisma (`src/prisma.service.ts`, removido); agora é explícito em cada repository via `notDeleted()` (`src/database/soft-delete.ts`).
- **Transação atômica:** `EnrollmentRequestsService.approve()` e `.cancel()` agora usam `db.transaction()` explícito para as duas escritas (liberar/ocupar a aula + atualizar o status da candidatura) — antes eram duas chamadas Prisma sequenciais sem `$transaction`.
- **Achado real (não aparecia nos testes unitários mockados):** `DATABASE_URL` no `.env` usa `?schema=public` (convenção do Prisma) — o driver `postgres` não reconhece esse parâmetro e a conexão falhava com `unrecognized configuration parameter "schema"`. Corrigido removendo esse parâmetro antes de conectar (`toPostgresJsConnectionString()` em `src/database/drizzle.service.ts`), sem precisar mudar a `DATABASE_URL` já em uso.
- **Validado de ponta a ponta contra o banco real** (não só testes mockados): `POST /users` (escrita) e `POST /auth/login` (leitura relacional com `upsUser`) testados manualmente contra o Postgres local.
- **Comandos novos:** `pnpm db:generate` (gera migration a partir do schema), `pnpm db:migrate` (aplica migrations pendentes), `pnpm db:studio` (Drizzle Studio). Substituem `prisma generate`/`prisma migrate dev`/`prisma migrate deploy`.
- **`@prisma/client` e `prisma` removidos do `package.json`.** `prisma/schema.prisma` e `prisma/migrations/` mantidos como referência histórica (não é mais a fonte de verdade).

**Nota sobre documentação (sincronizada):** `docs/03-endpoints.md` e `docs/04-regras-negocio.md` já descrevem o fluxo real de `enrollment-requests` (o módulo `/swap-requests` foi removido do banco pela migration `remove_swap_requests`; o texto remanescente em 04 foi corrigido). README e `docs/01`/`02` também foram sincronizados com o código desta rodada. A única divergência registrada é a spec `specs/003-substitution-limit-govbr` (pedia limite em horas/dia; o código implementou contagem de substituições aprovadas por semestre).

### Fase 2 — Modelo de dados multi-tenant (implementada)

- **Tabelas novas:** `Networks` (tenant real, ADR-004), `WorkloadTypes` (catálogo global fixo, 5 categorias seedadas na migration), `WorkloadPolicies` (config por rede), `TeacherWorkloadRecords` (jornada docente, com `networkId` denormalizado), `AuditLog` (rastreabilidade, com `networkId` denormalizado). `Schools` ganhou `networkId` NOT NULL.
- **Achado real corrigido antes da Fase 2 (bloqueava o teste E2E, não era escopo original):** a migration `prisma/migrations/20260818220000_normalize_profile_names` existia no repositório mas **nunca tinha sido aplicada** neste banco local (`_prisma_migrations` não a listava) — o perfil `MASTER` não existia de fato; havia um `Profiles.id=4` com nome `'PROFESSOR'` duplicado (não referenciado por nada) em vez de `MASTER`. Corrigido aplicando a normalização pendente diretamente via SQL (removendo o duplicado antes, para que o `id=4` liberado fosse ocupado pelo `MASTER` real, mantendo compatível com `ProfileEnum.MASTER = 4`).
- **Migration com backfill:** `drizzle/migrations/0001_conscious_roxanne_simpson.sql`, editada à mão após o `drizzle-kit generate` para sequenciar corretamente contra dados já existentes: cria `Networks`, insere `'Rede Padrão'`, cria `WorkloadTypes` e semeia as 5 linhas, só então adiciona `Schools.networkId` (nullable → backfill para a Rede Padrão → `SET NOT NULL`). Testada de verdade contra o Postgres local com a escola pré-existente (`Escola Teste`) — o backfill funcionou sem erro.
- **Decisão de escopo (ADR-005 revisado):** `networkId` denormalizado SOMENTE em `TeacherWorkloadRecords`/`AuditLog` (consumidor real hoje); `Classes`/`EnrollmentRequest`/`UsersProfilesSchools` não ganharam a coluna nesta fase — não há leitor para ela sem RLS ativo.
- **Decisão de escopo (ADR-006, revisado depois):** o RLS ficou fora da Fase 2 por exigir um mecanismo de sessão por request; foi **ativado na rodada de segurança** com `runWithRlsScope` (conexão reservada + GUCs de sessão + AsyncLocalStorage) e o `RlsContextInterceptor`, com políticas fail-closed nas tabelas que têm `networkId`. A app conecta como papel NOSUPERUSER e as migrations usam `MIGRATION_DATABASE_URL`.
- **Regra de negócio central implementada:** `TeacherWorkloadRecordsService` valida, antes de criar/editar um registro, se a soma das horas vigentes do mesmo tipo para aquele professor/escola ultrapassaria `WorkloadPolicies.maxHoursPerWeek` da rede — rejeita com 400 se sim. Toda criação/edição/remoção é registrada em `AuditLog`.
- **Módulos novos:** `NetworksModule` (CRUD, MASTER-only para escrita), `WorkloadPoliciesModule` (CRUD, MASTER-only para escrita), `TeacherWorkloadRecordsModule` (CRUD com `TenantGuard`+`RolesGuard`, endpoint `/me` para o professor ver os próprios registros), `AuditLogModule` (leitura MASTER-only).
- **Validado de ponta a ponta contra o banco real:** rede criada → escola vinculada a ela → política de 10h/semana para carga suplementar → registro de 6h aceito (201) → registro adicional de 6h (totalizando 12h) corretamente rejeitado (400, mensagem com os números certos) → aceite registrado em `AuditLog`. Dados de teste removidos após a validação.
**Como validar (naquela fase):** `pnpm run build` e `pnpm test` (194 testes, 187 passando — as mesmas 7 falhas pré-existentes de antes, 0 regressão nova). Novos testes em `src/modules/networks/*.spec.ts`, `src/modules/workload-policies/*.spec.ts`, `src/modules/audit-log/*.spec.ts`, `src/modules/teacher-workload-records/*.spec.ts`.

### Fase 2b — `MonthlyClosingReports` (implementada e commitada)

- **Geração:** `POST /monthly-closing-reports/generate` (`userId`, `schoolId`, `referenceMonth` formato `YYYY-MM`) agrega os `TeacherWorkloadRecords` cujo período de vigência (`validFrom`/`validTo`) sobrepõe o mês, agrupando e somando `hours` por `workloadType.code` (`src/modules/monthly-closing-reports/monthly-closing-reports.repository.ts#aggregateWorkload`). Grava `status: 'DRAFT'`.
- **Idempotência:** regerar um relatório ainda em `DRAFT` sobrescreve o `workloadBreakdown` (permite capturar lançamentos novos antes da revisão da gestão); regerar um relatório já `REVIEWED`/`CLOSED` é rejeitado com 400 — o ajuste passa pelo fluxo de correção explícita (`reopen`, abaixo), nunca por sobrescrita silenciosa da geração automática.
- **Transições:** `PATCH /:id/review` (`DRAFT`→`REVIEWED`, seta `reviewedById`/`reviewedAt`) e `PATCH /:id/close` (`REVIEWED`→`CLOSED`; não permite pular direto de `DRAFT`). Guardadas por `RolesGuard(MASTER, DIRETOR, AUXILIAR_ADMIN)`; como a rota é por `:id` (sem `schoolId` no corpo), a checagem fina de posse da escola do relatório é feita dentro do `MonthlyClosingReportsService` (mesmo padrão de `TeacherWorkloadRecordsService.update/remove`).
- **Correção (`reopen`):** `PATCH /:id/reopen` volta um relatório `REVIEWED`/`CLOSED` para `DRAFT` com justificativa obrigatória (mínimo 10 caracteres, registrada no `AuditLog`), permitindo regerar/ajustar antes de nova revisão; reabrir um relatório já em `DRAFT` é rejeitado com 400. Mesmas guardas de `review`/`close` (perfil de gestão + posse da escola no service).
- **Leitura:** `GET /:id` libera o próprio professor (dono do relatório) mesmo sem perfil de gestão; `GET /` (listagem) exige perfil de gestão.
- **Auditoria:** geração, revisão, fechamento e reabertura registrados em `AuditLog` (reaproveita `AuditLogService` da Fase 2).
- **Validado de ponta a ponta contra o banco real:** professor com AULA=20h (vigente desde jan/2026) + SUPLEMENTAR=6h (vigente desde fev/2026) + SUBSTITUICAO=3h (só em fev/2026) → relatório de março/2026 gerado com `{AULA: 20, SUPLEMENTAR: 6, total: 26}` (SUBSTITUICAO corretamente excluído por não vigorar em março) → `close` sem `review` prévio rejeitado (400) → `review` → `close` → regenerar depois de `CLOSED` rejeitado (400). Dados de teste removidos após a validação.
- **Ficou de fora (documentado, não é regressão):** envio do relatório fechado por e-mail/convite (fora do escopo desta rodada).

**Como validar (números daquela rodada — hoje são 594 testes em 61 suítes + 7 E2E):** `npx tsc --noEmit` e `pnpm test` (**263/263 testes, 33 suítes, 0 falhas**). Novos testes em `src/modules/monthly-closing-reports/monthly-closing-reports.service.spec.ts`.

---

## Próximos Passos

1. Corrigir os defeitos críticos/altos D1–D4 (`docs/status-funcionalidades.md`, Seção 2).
2. Levar o roteiro `docs/guias-de-teste/api/testar-api.sh` para o CI (job com Postgres de serviço) — quando D1–D4 forem corrigidos, ele deve terminar com 0 falhas.
3. Abrir PR `v2 → main` (o CI só roda na `main`).

---

*Documento atualizado em: 2026-10-22 (status revalidado contra o sistema rodando; ver `docs/status-funcionalidades.md`)*
