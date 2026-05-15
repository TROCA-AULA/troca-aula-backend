---

description: "Task list for Sistema de Troca de Aulas implementation"

---

# Tasks: Sistema de Troca de Aulas

**Input**: Design documents from `specs/01-swap-request/`

**Prerequisites**: plan.md ✅, spec.md ✅

---

## Formato: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (diferentes arquivos, sem dependências)
- **[Story]**: Qual user story pertence (US1, US2, US3, US4)

---

## Fase 1: Preparação do Banco

**Propósito**: Atualizar schema do Prisma e criar migrations

- [ ] T001 [P] Adicionar campos de horário em Class (dayOfWeek, startTime, endTime)
- [ ] T002 [P] Criar modelo SwapRequests no schema.prisma
- [ ] T003 Executar `npx prisma migrate dev` para criar tabela

---

## Fase 2: Estrutura do Módulo

**Propósito**: Criar arquivos base do módulo SwapRequests

- [ ] T004 [P] Criar diretório src/modules/swap-requests/
- [ ] T005 [P] Criar entity swap-request.entity.ts
- [ ] T006 Criar swap-requests.module.ts
- [ ] T007 Criar swap-requests.repository.ts
- [ ] T008 [P] Criar DTOs (create, update, get)

---

## Fase 3: User Story 1 - Criar Solicitação (P1) 🎯 MVP

**Goal**: Professor consegue solicitar troca de aula

**Teste Independente**: Criar solicitação e verificar criação no banco

### Implementação

- [ ] T009 [US1] Implementar swap-requests.service.ts (método create com verificação de conflito)
- [ ] T010 [US1] Implementar swap-requests.controller.ts (POST /swap-requests)
- [ ] T011 [US1] Adicionar validação de dados nos DTOs
- [ ] T012 [US1] Adicionar lógica de verificação de conflito de horário
- [ ] T013 [US1] Testar criação de solicitação via Postman/cURL

**Checkpoint**: US1 funcionando

---

## Fase 4: User Story 2 - Aprovação (P1) 🎯

**Goal**: Professor substituto aceita/recusa solicitação

**Teste Independente**: Aceitar solicitação pendente e verificar status

### Implementação

- [ ] T014 [US2] Adicionar métodos accept/reject no service
- [ ] T015 [US2] Adicionar endpoints PATCH no controller
- [ ] T016 [US2] Validar que apenas target pode aceitar/rejeitar
- [ ] T017 [US2] Testar fluxo accept/reject

**Checkpoint**: US1 + US2 funcionando

---

## Fase 5: User Story 3 - Listagem (P2)

**Goal**: Listar solicitações com filtros

**Teste Independente**: Listar e filtrar por status

### Implementação

- [ ] T018 [US3] Implementar método findAll no service com filtros
- [ ] T019 [US3] Adicionar GET /swap-requests no controller
- [ ] T020 [US3] Implementar GET /swap-requests/:id
- [ ] T021 [US3] Testar listagem com filtros

**Checkpoint**: US1 + US2 + US3 funcionando

---

## Fase 6: User Story 4 - Cancelamento (P3)

**Goal**: Cancelar solicitações pendentes

**Teste Independente**: Cancelar solicitação PENDING

### Implementação

- [ ] T022 [US4] Adicionar método cancel no service
- [ ] T023 [US4] Adicionar PATCH /swap-requests/:id/cancel no controller
- [ ] T024 [US4] Validar que apenas requester pode cancelar
- [ ] T025 [US4] Validar que apenas PENDING pode ser cancelado
- [ ] T026 [US4] Testar cancelamento

**Checkpoint**: Todas as user stories implementadas

---

## Fase 7: Testes

**Propósito**: Garantir qualidade do código

- [ ] T027 [P] Teste unitário para swap-requests.service.ts
- [ ] T028 [P] Teste unitário para swap-requests.controller.ts
- [ ] T029 Executar pnpm test para verificar覆盖率

---

## Fase 8: Polish

**Propósito**: Ajustes finais

- [ ] T030 Revisar código e aplicar lint (pnpm lint)
- [ ] T031 Build do projeto (pnpm build)
- [ ] T032 Atualizar README.md com nova API

---

## Dependências & Ordem de Execução

### Dependencies

- **Fase 1**: Sem dependências - pode iniciar imediatamente
- **Fase 2**: Depende de Fase 1
- **Fase 3**: Depende de Fase 2
- **Fase 4**: Depende de Fase 3
- **Fase 5**: Depende de Fase 2 (pode paralelo com Fases 3-4)
- **Fase 6**: Depende de Fase 4
- **Fase 7**: Depende de todas as fases de implementação
- **Fase 8**: Depende de Fase 7

### Parallel Opportunities

- T001 e T002 podem rodar em paralelo
- T004 e T005 podem rodar em paralelo
- T008 pode rodar em paralelo (todos os DTOs)
- T027 e T028 podem rodar em paralelo

---

## Notas

- [P] = tasks diferentes arquivos, sem dependências
- User stories devem ser implementadas em ordem de prioridade
- Commitar após cada task ou grupo lógico
- Validar com testes antes de avançar para próxima fase