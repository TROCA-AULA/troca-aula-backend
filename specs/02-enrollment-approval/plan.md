# Implementation Plan: Sistema de Inscricao com Aprovacao

**Feature Branch**: `feat/enrollment-approval`

**Specification**: `specs/02-enrollment-approval/spec.md`

**Status**: Ready for Execution

---

## Overview

Este plano descreve a implementacao do novo fluxo de inscricao de professores em aulas com aprobacao do diretor. O fluxo atual sera substituido por um sistema de EnrollmentRequest.

---

## Dependencies

### External
- NestJS Framework
- Prisma ORM
- PostgreSQL Database
- JWT Authentication (existing)

### Internal
- Modulo Classes existente
- Modulo SwapRequests (sera removido apos migracao)
- Sistema de autenticacao existente

---

## Implementation Sequence

### Phase 1: Schema e DTOs (Tasks 1-3)
Execute primeiro - cria base de dados

### Phase 2: Modulo EnrollmentRequest (Tasks 4-7)
Cria novo modulo completo

### Phase 3: Integracao e Ajustes (Tasks 8-10)
Conecta com Classes e atualiza fluxos

### Phase 4: Cleanup e Testes (Tasks 11-13)
Remove SwapRequests e valida testes

---

## Changes Summary

### New Files
- `prisma/migrations/`: nova migration para EnrollmentRequest
- `src/modules/enrollment-requests/`: novo modulo completo
  - dto/create.dto.ts
  - dto/update.dto.ts
  - dto/filter.dto.ts
  - enrollment-requests.controller.ts
  - enrollment-requests.service.ts
  - enrollment-requests.module.ts
  - enrollment-requests.service.spec.ts
  - enrollment-requests.controller.spec.ts

### Modified Files
- `prisma/schema.prisma`: adicionar EnrollmentRequest + campo available
- `src/app.module.ts`: importar novo modulo
- `src/modules/classes/`: ajustar para novo fluxo
- `specs/02-enrollment-approval/spec.md`: atualizar para Done

### Removed Files
- `src/modules/swap-requests/`: modulointeiro removido

---

## Migration Strategy

1. Criar nova migration sem remover SwapRequests imediatamente
2. Implementar novo modulo EnrollmentRequest paralelamente
3. Atualizar Classes para usar novo fluxo gradualmente
4. Remover SwapRequests apos validacao

**Rollback Plan**: Manter Backup do schema.prisma anterior

---

## Testing Strategy

- Criar testes unitarios para EnrollmentRequestService
- Criar testes e2e para endpoints
- Garantir que testes existentes de Classes continuem passando
- Executar testes antes eapos cada task

---

## Acceptance Criteria

- [ ] Professor pode solicitar inscricao em aula disponivel
- [ ] Diretor pode aprovar solicitacao (vincula professor)
- [ ] Diretor pode rejeitar solicitacao (nao vincula)
- [ ] Historico de solicitacoes mantido
- [ ] Professor pode cancelar inscricao (libera aula)
- [ ] SwapRequests removido do sistema
- [ ] Todos os testes passando
- [ ] Build passando