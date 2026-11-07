# Catálogo de Endpoints (API REST)

> **Atualizado em 2026-10-22** a partir dos controllers em `src/modules/**/*.controller.ts` e validado contra o sistema rodando (roteiro `docs/guias-de-teste/api/testar-api.sh`, na raiz do projeto).
> Exemplos completos de chamada, com o resultado esperado de cada regra, estão em `docs/guias-de-teste/03-guia-api-requests.md` (raiz do projeto). A documentação interativa (Swagger) fica em `http://localhost:5000/api`.

## Convenções

- **Base URL local:** `http://localhost:5000` (variável `PORT` do `.env`).
- **Autenticação:** `Authorization: Bearer <access_token>`; o token vem de `POST /auth/login`.
- **Resposta de sucesso:** o próprio objeto ou uma lista, **sem envelope** (`{data, message}` não é usado).
- **Resposta de erro:** `{"message": "..." | ["campo..."], "error": "Bad Request", "statusCode": 400}`.
- **Validação:** `ValidationPipe` com `whitelist` + `forbidNonWhitelisted`, ou seja, campo não declarado no DTO gera **400**.
- **Corpo vazio:** não envie `Content-Type: application/json` sem corpo (o Fastify responde 400 "Body cannot be empty").

### Legenda da coluna "Quem pode"

| Valor | Significado |
|---|---|
| Público | Sem token |
| Logado | Qualquer token válido |
| MASTER | Perfil MASTER (`profileId` 4) |
| COORD | Coordenador municipal (`profileId` 5). Não é vínculo de escola: vem de `UserNetworkLinks`, e no login vira um vínculo sintético de perfil 5 com **cada escola** da rede coordenada. O service confere a rede (`assertCanManageNetwork`): ação em outra rede → 403 |
| Gestão | MASTER, COORD, DIRETOR (1) ou AUXILIAR_ADMIN (2) |
| Gestão **da escola** | Gestão com vínculo **aprovado** na escola do `schoolId` informado (`TenantGuard`); MASTER passa sempre |
| Dono | O próprio usuário do recurso |

> Toda leitura de `Networks`, `Schools`, `WorkloadPolicies`, `TeacherWorkloadRecords` e `AuditLog` passa também pelo **RLS**: fora do MASTER, só aparecem linhas das redes em que o usuário tem vínculo aprovado.

---

## Sistema

| Método | Rota | Quem pode | Corpo / Query | Sucesso |
|---|---|---|---|---|
| GET | `/` | Público | — | 200, texto de boas-vindas |
| GET | `/health` | Público | — | 200 `{"status":"ok"}` |

## Autenticação — `/auth`

| Método | Rota | Quem pode | Corpo | Sucesso | Erros comuns |
|---|---|---|---|---|---|
| POST | `/auth/login` | Público | `{email, password}` | 200 `{access_token}` (vale `JWT_EXPIRES_IN`, padrão 12h) | 401 credenciais inválidas |
| POST | `/auth/refresh` | Logado | — | 200 `{access_token}` novo, montado com os dados **atuais** (disciplina, vínculos, escolas do coordenador) | 401 sem token, token vencido ou usuário removido |
| PATCH | `/auth/change-password` | Logado | `{currentPassword, newPassword (≥ 8)}` | 200 | 400 senha curta · 401 senha atual errada |
| GET | `/auth/govbr-auth-url` | Público | — | **501** "Integracao Gov.br em desenvolvimento" | — (stub) |
| POST | `/auth/login-govbr` | Público | — | **401** "Recurso em desenvolvimento" | — (stub) |

## Usuários — `/users`

| Método | Rota | Quem pode | Corpo / Query | Sucesso | Observações |
|---|---|---|---|---|---|
| POST | `/users` | Público | `{name, email, phone, password (≥ 8), subjectId?, residenceNetworkId?}` | 201 usuário (sem senha) | Auto-cadastro. E-mail repetido → **409** "E-mail já cadastrado". Rede inexistente → 400 "Município (rede) não encontrado" |
| GET | `/users` | Gestão | `?schoolId=&profileId=&email=` | 200 lista | Fora do MASTER exige `schoolId` (escola gerida) ou `email`; sem os dois → 403. Busca só por e-mail devolve apenas `{id, name, email, subjectId}` |
| GET | `/users/:id` | Logado | — | 200 | |
| PATCH | `/users/:id` | Dono ou Gestão de uma escola do usuário | `{name?, email?, phone?, subjectId?, substitutionLimitPerSemester?, residenceNetworkId? (número ou null)}` | 200 | `password` não é aceito (400; troca de senha é em `/auth/change-password`). O dono não muda o próprio limite nem troca a disciplina já definida. Ninguém altera conta de perfil igual ou acima do seu → 403 |
| DELETE | `/users/:id` | MASTER | — | 200 (soft delete) | |
| POST | `/users/:id/assign-profile` | Gestão **da escola** | `{profileId, schoolId}` | 201 vínculo já aprovado | 403 sem vínculo na escola · 403 "Você só pode conceder ou remover perfis abaixo do seu" (fora do MASTER) |
| POST | `/users/:id/unassign-profile` | Gestão **da escola** | `{profileId, schoolId}` | 201 | Mesma regra de hierarquia |
| POST | `/users/:id/reset-password` | Gestão | — | 201 `{tempPassword, emailSent}` | Envia a senha por e-mail quando há `SMTP_HOST` (`emailSent: true`). DIRETOR/AUXILIAR/COORDENADOR só de quem compartilha escola gerenciada por ele **e** tem perfil abaixo do seu; senão 403. Ninguém redefine a do MASTER |

## Perfis — `/profile`

| Método | Rota | Quem pode | Corpo | Observações |
|---|---|---|---|---|
| GET | `/profile`, `/profile/:id` | Logado | — | `1`=DIRETOR · `2`=AUXILIAR_ADMIN · `3`=PROFESSOR · `4`=MASTER · `5`=COORDENADOR_MUNICIPAL (ids fixos, o código depende deles) |
| POST / PATCH / DELETE | `/profile[/:id]` | MASTER | `{name}` | |

## Disciplinas — `/subjects`

| Método | Rota | Quem pode | Corpo |
|---|---|---|---|
| GET | `/subjects`, `/subjects/:id` | Público | — |
| POST / PATCH / DELETE | `/subjects[/:id]` | MASTER | `{name}` · DELETE é lógico (some das listas; quem já tinha a disciplina continua com ela). Tela: `/master/disciplinas` |

## Redes de ensino — `/networks`

| Método | Rota | Quem pode | Corpo | Observações |
|---|---|---|---|---|
| GET | `/networks`, `/networks/:id` | Logado | — | Filtrado pelo RLS |
| POST | `/networks` | MASTER | `{name}` | |
| PATCH | `/networks/:id` | MASTER | `{name}` | |
| GET | `/networks/:id/interconnections` | MASTER, COORD da rede | — | `{networkId, interconnections:[{networkId, networkName}]}` |
| PUT | `/networks/:id/interconnections` | MASTER, COORD da rede | `{allowedNetworkIds: number[]}` | Substitui a lista. Direcional: as vagas de `:id` ficam visíveis para professores das redes listadas |

## Coordenadores municipais — `/network-coordinators`

| Método | Rota | Quem pode | Corpo | Observações |
|---|---|---|---|---|
| GET | `/network-coordinators` | MASTER | — | `[{userId, userName, userEmail, userPhone, networkId, networkName, approvedAt}]` |
| POST | `/network-coordinators` | MASTER | `{userId, networkId}` | 201 · 400 já coordena · 404 usuário/rede inexistente. Vale no próximo login da pessoa |
| DELETE | `/network-coordinators/:userId/:networkId` | MASTER | — | 404 se não existir |

## Escolas — `/schools`

| Método | Rota | Quem pode | Corpo | Observações |
|---|---|---|---|---|
| GET | `/schools`, `/schools/:id` | Logado | — | Filtrado pelo RLS |
| POST | `/schools` | MASTER, COORD da rede | `{name, networkId}` | Sem `networkId` → 400 · COORD em outra rede → 403 |
| PATCH | `/schools/:id` | MASTER, COORD da rede | campos parciais | COORD não move a escola para outra rede |
| DELETE | `/schools/:id` | MASTER | — | |
| GET | `/schools/:id/teacher-groups` | Gestão (da escola, checado no service) | — | `{schoolId, ungroupedDelayMinutes, ungroupedEffectiveDelayMinutes, allowedNetworkIds, allowedNetworks:[{id,name}], acceptedNetworkIds, groups:[{id,name,priority,delayMinutes,professorIds}]}` — grupos em ordem de prioridade |
| POST | `/schools/:id/teacher-groups` | idem | `{name (≤ 80), priority? ≥ 0, delayMinutes ≥ 0}` | 201 com a **configuração inteira**. Sem `priority` → próxima livre. Prioridade menor com espera maior que a seguinte → 400 |
| PATCH | `/schools/:id/teacher-groups/:groupId` | idem | `{name?, priority?, delayMinutes?}` | Mesma validação de ordem |
| DELETE | `/schools/:id/teacher-groups/:groupId` | idem | — | |
| PUT | `/schools/:id/teacher-groups/:groupId/members` | idem | `{professorIds: number[]}` | Substitui os membros |
| PATCH | `/schools/:id/priority-settings` | idem | `{ungroupedDelayMinutes?, acceptedNetworkIds?: number[] \| null}` | Rede não interconectada pelo município → 400 ("o mais restritivo vence") |

**Regra de prioridade:** escola sem grupos → todos veem na hora. Com grupos → o melhor grupo do professor (menor `priority`) define a espera; quem está sem grupo espera `max(maior espera dos grupos, ungroupedDelayMinutes)`. A rota antiga `PATCH /schools/:id/priority-window` (`priorityWindowHours`) foi **removida**.

## Aulas — `/classes`

| Método | Rota | Quem pode | Corpo / Query | Observações |
|---|---|---|---|---|
| GET | `/classes` | Logado | `?available=true&schoolId=` | O `userId` vem do token. Professor: só a sua disciplina, aulas futuras + regra de elegibilidade (grupos, município, exclusões). Gestão não-MASTER: só as próprias escolas. MASTER: tudo |
| GET | `/classes/coverage-stats` | Logado (Gestão **da escola** se `schoolId` vier) | `?schoolId=&subjectId=&dayOfWeek=0..6` | `{totalVagas, cobertas, taxaCobertura, nivel}`; cobertas = `available=false` |
| GET | `/classes/:id` | Logado | — | |
| POST | `/classes` | Gestão **da escola** | `{schoolId, subjectId, createdByd, statededAt, finishedAt}` | Os nomes `createdByd`/`statededAt` têm erro de digitação, mas **são o contrato real**. Grava `dayOfWeek/startTime/endTime` (horário de Brasília) a partir das datas. Dispara notificação/e-mail |
| PATCH | `/classes/:id` | Gestão (posse da escola checada no service) | `{registredById?, approvedById?}` | |
| DELETE | `/classes/:id` | idem | — | Soft delete |

As rotas antigas `POST/DELETE /classes/:id/enroll` (inscrição direta, sem aprovação) foram **removidas** (D21): toda inscrição passa por candidatura.

## Candidaturas — `/enrollment-requests`

| Método | Rota | Quem pode | Corpo / Query | Sucesso | Erros de regra |
|---|---|---|---|---|---|
| POST | `/enrollment-requests/request/:classId` | Logado (professor) | — | 201 `PENDING` | 400 aula indisponível · 400 "Esta aula já aconteceu" · 400 já existe pendente · 403 outra disciplina · 403 elegibilidade (espera do grupo, município, exclusão) · 400 conflito de horário (datas reais, encostar não conta) · 400 limite do semestre (`null`/`0` = sem limite) |
| GET | `/enrollment-requests` | Logado | `?status=&classId=&professorId=&userId=&schoolId=&createdAfter=&createdBefore=&mes=YYYY-MM` | 200 lista; cada item traz `user {id, name, email}` e `class {id, statededAt, finishedAt, schoolId, schoolName, subjectName}` | Escopo aplicado pelo service conforme o perfil |
| GET | `/enrollment-requests/substitution-limit/:professorId` | Dono ou Gestão | — | 200 `{current, limit, percentage, canApply}` | 403 outro professor |
| GET | `/enrollment-requests/:id` | Logado | — | 200 | |
| PATCH | `/enrollment-requests/:id/approve` | Gestão da escola da aula | — | 200 `APPROVED`; a aula vira `available=false` + `enrolledById` | 400 não pendente · 400 "Esta aula já foi preenchida por outra candidatura aprovada" · 403 outra escola |
| PATCH | `/enrollment-requests/:id/reject` | Gestão da escola da aula | `{rejectionReason?}` (até 500 caracteres) | 200 `REJECTED` com `rejectionReason` | O motivo vai para o professor (lista e notificação). Vazio → `null` |
| DELETE | `/enrollment-requests/:id` | Dono | — | 200 `CANCELLED` | 403 "Apenas o professor pode cancelar" |

Status possíveis: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

## Preferências do professor — `/professor-preferences`

| Método | Rota | Quem pode | Corpo |
|---|---|---|---|
| GET | `/professor-preferences` | Logado (as próprias) | — · devolve `{networkInterests, schoolExclusions, residenceNetworkId, residenceNetworkName, hasContract}` |
| GET | `/professor-preferences/options` | Logado | — · devolve `{networks:[{id,name}], schools:[{id,name,networkId}]}` para montar a tela (o professor não lê o catálogo pelo RLS) |
| POST | `/professor-preferences/network-interests` | Logado | `{networkId}` |
| DELETE | `/professor-preferences/network-interests/:networkId` | Logado | — |
| POST | `/professor-preferences/school-exclusions` | Logado | `{schoolId}` — a exclusão vence qualquer outro critério |
| DELETE | `/professor-preferences/school-exclusions/:schoolId` | Logado | — |

## Políticas de carga horária — `/workload-policies`

| Método | Rota | Quem pode | Corpo | Observações |
|---|---|---|---|---|
| GET | `/workload-policies`, `/:id` | Logado | `?networkId=` | Filtrado pelo RLS |
| POST | `/workload-policies` | MASTER, COORD da rede | `{networkId, workloadTypeId, maxHoursPerWeek?, ataOficialRequired?}` | Rede + tipo é único; duplicata → **409** |
| PATCH | `/workload-policies/:id` | MASTER, COORD da rede | campos parciais | |

Tipos de carga (catálogo fixo, sem rota de escrita): `1` AULA · `2` PEDAGOGICO_COLETIVO · `3` LIVRE_ESCOLHA · `4` SUPLEMENTAR · `5` SUBSTITUICAO.

## Jornada docente — `/teacher-workload-records`

| Método | Rota | Quem pode | Corpo / Query | Observações |
|---|---|---|---|---|
| POST | `/teacher-workload-records` | Gestão **da escola** | `{userId, schoolId, workloadTypeId, hours, validFrom, validTo?, ataOficialRef?, justification?}` | 400 se a soma vigente do tipo passar do `maxHoursPerWeek` da rede. Auditado |
| GET | `/teacher-workload-records` | Gestão **da escola** | `?schoolId=` | |
| GET | `/teacher-workload-records/me` | Logado | — | Os registros do próprio professor |
| GET | `/teacher-workload-records/:id` | Logado (posse checada no service) | — | |
| PATCH / DELETE | `/teacher-workload-records/:id` | Gestão (posse checada no service) | campos parciais | Auditado |

## Fechamento mensal — `/monthly-closing-reports`

| Método | Rota | Quem pode | Corpo / Query | Regras |
|---|---|---|---|---|
| POST | `/monthly-closing-reports/generate` | Gestão **da escola** | `{userId, schoolId, referenceMonth: "YYYY-MM"}` | Cria/sobrescreve em `DRAFT`; `REVIEWED`/`CLOSED` → 400 |
| GET | `/monthly-closing-reports` | Gestão **da escola** | `?schoolId=&userId=&referenceMonth=` | |
| GET | `/monthly-closing-reports/:id` | Dono ou Gestão | — | Outro professor → 403 |
| PATCH | `/monthly-closing-reports/:id/review` | Gestão | — | `DRAFT → REVIEWED` |
| PATCH | `/monthly-closing-reports/:id/close` | Gestão | — | `REVIEWED → CLOSED` (de `DRAFT` → 400) |
| PATCH | `/monthly-closing-reports/:id/reopen` | Gestão | `{justification (≥ 10)}` | `REVIEWED/CLOSED → DRAFT`, auditado |

`workloadBreakdown` vem como `{ "<CODIGO_DO_TIPO>": horas, ..., "total": horas }`.

## Auditoria — `/audit-log`

| Método | Rota | Quem pode | Observações |
|---|---|---|---|
| GET | `/audit-log/network/:networkId` | MASTER, COORD da rede | Últimas alterações da rede |
| GET | `/audit-log/:entityType/:entityId` | MASTER | Ex.: `/audit-log/MonthlyClosingReports/3` |
