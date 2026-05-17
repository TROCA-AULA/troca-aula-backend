---

description: "Task list for Substitution Limit + Gov.br Integration feature"
---

# Tasks: Substitution Limit + Gov.br Integration

**Input**: Design documents from `/specs/003-substitution-limit-govbr/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Not explicitly requested in feature specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETED

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize TypeScript project with NestJS dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETED

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Note**: Foundation already in place (NestJS, Prisma, PostgreSQL, JWT auth)

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Controle de Limite de Substituições (Priority: P1) ✅ IMPLEMENTED

**Goal**: Professor deve ter limite de substituições por semestre controlado automaticamente pelo sistema

**Independent Test**: O diretor pode configurar o limite na escola e o sistema bloqueia automaticamente candidaturas quando o professor atinge o limite

### Implementation for User Story 1

- [ ] T010 [P] [US1] Add substitutionLimitPerSemester field to Schools entity in prisma/schema.prisma
- [ ] T011 [P] [US1] Create migration for new field in prisma/migrations/
- [ ] T012 [US1] Implement limit check logic in src/modules/enrollment-requests/enrollment-requests.service.ts (depends on T010, T011)
- [ ] T013 [US1] Add blocking behavior when limit exceeded in src/modules/enrollment-requests/enrollment-requests.service.ts
- [ ] T014 [US1] Add handling for NULL/zero limit (no restriction) in src/modules/enrollment-requests/enrollment-requests.service.ts
- [ ] T015 [US1] Add error message "Limite de substituições atingido para este semestre" for blocked enrollments
- [ ] T016 [US1] Add semester boundary logic for counting only current semester approvals

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Integração com Conta Gov.br (Priority: P2) ✅ IMPLEMENTED

**Goal**: Sistema deve utilizar Conta Gov.br para autenticação, retornando erro temporário durante integração

**Independent Test**: Ao tentar autenticar via Gov.br, sistema retorna mensagem indicando recurso em desenvolvimento

### Implementation for User Story 2

- [ ] T017 [P] [US2] Add POST /auth/login-govbr endpoint in src/modules/auth/auth.controller.ts
- [ ] T018 [US2] Implement Gov.br auth service stub in src/modules/auth/auth.service.ts (depends on T017)
- [ ] T019 [US2] Return 401 with "Recurso em desenvolvimento" message in src/modules/auth/auth.service.ts
- [ ] T020 [US2] Add handling for invalid token returning 404 with "Recurso em desenvolvimento"
- [ ] T021 [US2] Update auth module routing in src/modules/auth/auth.module.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Atualização de Documentação (Priority: P3) ✅ COMPLETED

**Goal**: Documentação de contratos de API deve refletir as mudanças implementadas

**Independent Test**: Documentação em docs/10-contratos-api.md inclui novos endpoints e respostas

### Implementation for User Story 3

- [ ] T022 [P] [US3] Update API contracts in docs/10-contratos-api.md for enrollment limit feature
- [ ] T023 [P] [US3] Document POST /auth/login-govbr endpoint in docs/10-contratos-api.md
- [ ] T024 [US3] Add error response schemas for limit exceeded scenario
- [ ] T025 [US3] Add error response schemas for Gov.br endpoint

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T026 [P] Run existing unit tests in src/modules/enrollment-requests/
- [ ] T027 [P] Run existing unit tests in src/modules/auth/
- [ ] T028 Verify migration applies cleanly to database
- [ ] T029 Run quickstart.md validation if applicable
- [ ] T030 Verify build passes with npm run build
- [ ] T031 Verify lint passes with npm run lint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Add substitutionLimitPerSemester field to Schools entity in prisma/schema.prisma"
Task: "Create migration for new field in prisma/migrations/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Implementation Status

| Task Group | Status | Notes |
|------------|--------|-------|
| Phase 1: Setup | ✅ Complete | Existing infrastructure |
| Phase 2: Foundational | ✅ Complete | NestJS + Prisma + Auth ready |
| Phase 3: User Story 1 (P1) | ✅ Implemented | Field added, limit check implemented |
| Phase 4: User Story 2 (P2) | ✅ Implemented | Gov.br endpoint returns error |
| Phase 5: User Story 3 (P3) | ✅ Complete | Documentation updated |
| Phase 6: Polish | 🔄 Pending | Verification tasks remain |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence