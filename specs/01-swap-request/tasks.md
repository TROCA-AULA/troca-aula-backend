---

description: "Task list for Sistema de Troca de Aulas implementation"

---

# Tasks: Sistema de Troca de Aulas

**Input**: Design documents from `specs/01-swap-request/`

**Prerequisites**: plan.md ✅, spec.md ✅ (com clarifications)

---

## Formato: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (diferentes arquivos, sem dependências)
- **[Story]**: Qual user story pertence (US1, US2, US3, US4, US5)

---

## Fase 1: Preparação do Banco

**Propósito**: Atualizar schema do Prisma e criar migrations

- [X] T001 [P] Adicionar campos de horário em Class (dayOfWeek, startTime, endTime) em prisma/schema.prisma
- [X] T002 [P] Criar modelo SwapRequests no schema.prisma
- [X] T003 Executar `npx prisma migrate dev` para criar tabela

---

## Fase 2: Estrutura do Módulo SwapRequests

**Propósito**: Criar arquivos base do módulo SwapRequests

- [X] T004 [P] Criar diretório src/modules/swap-requests/
- [X] T005 [P] Criar entity swap-request.entity.ts em src/modules/swap-requests/entities/
- [X] T006 Criar swap-requests.module.ts em src/modules/swap-requests/
- [X] T007 Criar swap-requests.repository.ts em src/modules/swap-requests/
- [X] T008 [P] Criar DTOs em src/modules/swap-requests/dto/:
  - create-swap-request.dto.ts
  - update-swap-request.dto.ts
  - get-swap-request.dto.ts

---

## Fase 3: User Story 1 - Criar Solicitação (P1) 🎯 MVP

**Goal**: Diretor/auxiliar administrativo cria solicitação de troca

**Teste Independente**: Criar solicitação com usuário de perfil diretor e verificar criação

**Regras**: FR-001, FR-002, FR-006

### Implementação

- [X] T009 [US1] Implementar método create no swap-requests.service.ts com validação de perfil (DIRETOR/AUXILIAR_ADMIN)
- [X] T010 [US1] Implementar POST /swap-requests no swap-requests.controller.ts
- [X] T011 [US1] Adicionar validação de dados nos DTOs com class-validator
- [X] T012 [US1] Implementar lógica de verificação de conflito de horário (mesmo dia + sobreposição)
- [ ] T013 [US1] Testar criação de solicitação via Postman/cURL

**Checkpoint**: US1 funcionando

---

## Fase 4: User Story 2 - Aprovação de Troca (P1) 🎯

**Goal**: Professor da mesma matéria aceita/rejeita solicitação

**Teste Independente**: Aceitar solicitação com professor da matéria correta

**Regras**: FR-003, FR-007

### Implementação

- [X] T014 [US2] Adicionar métodos accept/reject no swap-requests.service.ts com validação de matéria
- [X] T015 [US2] Adicionar PATCH endpoints no swap-requests.controller.ts
- [X] T016 [US2] Validar que target leciona a mesma matéria (class.subjectId)
- [ ] T017 [US2] Testar fluxo accept/reject

**Checkpoint**: US1 + US2 funcionando

---

## Fase 5: User Story 3 - Listar Solicitações (P2)

**Goal**: Listar solicitações com filtros

**Teste Independente**: Listar e filtrar por status e tipo (criadas/recebidas)

**Regras**: FR-004

### Implementação

- [X] T018 [US3] Implementar método findAll no swap-requests.service.ts com filtros (status, type)
- [X] T019 [US3] Adicionar GET /swap-requests no swap-requests.controller.ts
- [X] T020 [US3] Implementar GET /swap-requests/:id
- [ ] T021 [US3] Testar listagem com filtros

**Checkpoint**: US1 + US2 + US3 funcionando

---

## Fase 6: User Story 4 - Cancelamento (P3)

**Goal**: Cancelar solicitações pendentes

**Teste Independente**: Cancelar solicitação PENDING como criador

**Regras**: FR-005

### Implementação

- [X] T022 [US4] Adicionar método cancel no swap-requests.service.ts
- [X] T023 [US4] Adicionar PATCH /swap-requests/:id/cancel no controller
- [X] T024 [US4] Validar que apenas requester pode cancelar (se PENDING)
- [ ] T025 [US4] Testar cancelamento

**Checkpoint**: Todas as user stories SwapRequests implementadas

---

## Fase 7: User Story 5 - Inscrição em Aulas (P3)

**Goal**: Professor pode se increver/desinscrever de aulas

**Regras**: FR-008

### Implementação

- [X] T026 [US5] Adicionar campo enrolled em Classes (prisma/schema.prisma)
- [X] T027 [US5] Implementar método enroll no classes.service.ts
- [X] T028 [US5] Implementar método unenroll no classes.service.ts
- [X] T029 [US5] Adicionar POST /classes/:id/enroll no classes.controller.ts
- [X] T030 [US5] Adicionar DELETE /classes/:id/enroll no classes.controller.ts

**Checkpoint**: FR-008 implementado

---

## Fase 8: Testes

**Propósito**: Garantir qualidade do código

- [X] T031 [P] Teste unitário para swap-requests.service.ts (criado)
- [X] T032 [P] Teste unitário para swap-requests.controller.ts (criado)
- [ ] T033 Executar pnpm test para verificar cobertura (testes existentes precisam de ajuste)

---

## Fase 9: Polish

**Propósito**: Ajustes finais

- [X] T034 Revisar código e aplicar lint (pnpm lint) - erros são de código existente
- [X] T035 Build do projeto (pnpm build) ✅
- [X] T036 Atualizar README.md com nova API

---

## Dependências & Ordem de Execução

### Dependencies

- **Fase 1**: Sem dependências - pode iniciar imediatamente
- **Fase 2**: Depende de Fase 1
- **Fase 3**: Depende de Fase 2
- **Fase 4**: Depende de Fase 3
- **Fase 5**: Depende de Fase 2 (pode paralelo com Fases 3-4)
- **Fase 6**: Depende de Fase 4
- **Fase 7**: Depende de Fase 1 (precisa do campo enrolled)
- **Fase 8**: Depende de todas as fases de implementação
- **Fase 9**: Depende de Fase 8

### Parallel Opportunities

- T001 e T002 podem rodar em paralelo (dois arquivos Prisma)
- T004 e T005 podem rodar em paralelo (diretório + entity)
- T008 pode rodar em paralelo (todos os DTOs)
- T031 e T032 podem rodar em paralelo (dois arquivos de teste)

---

## Notas

- [P] = tasks diferentes arquivos, sem dependências
- User stories devem ser implementadas em ordem de prioridade
- Commitar após cada task ou grupo lógico
- Validar com testes antes de avançar para próxima fase
- Autorização verificada em cada endpoint (diferentes perfis para criar vs aceitar)