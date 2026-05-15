# Implementation Plan: Sistema de Troca de Aulas

**Branch**: `feat/swap-request` | **Date**: 2026-05-14 | **Spec**: specs/01-swap-request/spec.md

**Input**: Feature specification from `specs/01-swap-request/spec.md`

---

## Summary

Criar módulo de solicitação de trocas de aulas entre professores. O professor solicita troca de uma de suas aulas, o professor substituto pode aceitar ou recusar, e o sistema verifica conflitos de horário.

---

## Technical Context

**Language/Version**: TypeScript 5.7

**Primary Dependencies**:
- NestJS 11
- Prisma 6.7
- PostgreSQL 15
- JWT (@nestjs/jwt)
- class-validator

**Storage**: PostgreSQL via Prisma ORM

**Testing**: Jest (já configurado no projeto)

**Target Platform**: Linux server (Docker)

**Project Type**: REST API (Web Service)

**Constraints**: Projeto de faculdade - manter simplicidade

**Scale/Scope**: Uso acadêmico - handful de usuários

---

## Constitution Check

✅ **Princípio I - Simplicity First**: Implementar apenas o necessário para o fluxo de troca  
✅ **Princípio II - Clean Architecture**: Controller → Service → Repository  
✅ **Princípio III - REST API Conventions**: Métodos HTTP padrão  
✅ **Princípio IV - Security Essentials**: JWT obrigatório, validação de dados  
✅ **Princípio V - Git Workflow**:conventional commits

---

## Project Structure

```text
specs/01-swap-request/
├── spec.md              # Este arquivo
├── plan.md              # Este arquivo
├── data-model.md        # Entidades e relacionamentos
├── contracts/           # Contratos de API
└── tasks.md             # Lista de tarefas (criado pelo /speckit.tasks)
```

**Source Code**:
```text
src/modules/
├── swap-requests/
│   ├── dto/
│   │   ├── create-swap-request.dto.ts
│   │   ├── update-swap-request.dto.ts
│   │   └── get-swap-request.dto.ts
│   ├── entities/
│   │   └── swap-request.entity.ts
│   ├── swap-requests.repository.ts
│   ├── swap-requests.service.ts
│   ├── swap-requests.controller.ts
│   └── swap-requests.module.ts
```

---

## Data Model

### Entidade: SwapRequest

```prisma
model SwapRequests {
  id          Int       @id @default(autoincrement())
  classId     Int       // Aula sendo trocada
  class       Classes   @relation(fields: [classId], references: [id])
  requesterId Int       // Professor que solicita
  requester   Users    @relation(fields: [requesterId], references: [id])
  targetId    Int       // Professor替代
  target      Users    @relation(fields: [targetId], references: [id])
  status      String    // PENDING, APPROVED, REJECTED, CANCELLED
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Ajustes na entidade Class existente:

Adicionar campos de horário:
- `dayOfWeek` (1-7, segunda a domingo)
- `startTime` (hora inicial)
- `endTime` (hora final)

---

## Contratos de API

### Endpoints

| Método | Endpoint | Descrição |
|--------|----------|------------|
| POST | /swap-requests | Criar solicitação de troca |
| GET | /swap-requests | Listar solicitações (filtros) |
| GET | /swap-requests/:id | Detalhar solicitação |
| PATCH | /swap-requests/:id/accept | Aceitar solicitação |
| PATCH | /swap-requests/:id/reject | Rejeitar solicitação |
| PATCH | /swap-requests/:id/cancel | Cancelar solicitação |

### Response Format

```json
{
  "data": { ... },
  "message": "string",
  "statusCode": 201
}
```

---

## Complexidade Simulada

N/A - arquitetura simples, sem justificativas necessárias

---

## Próximos Passos

1. Executar `/speckit.tasks` para gerar lista de tarefas
2. Implementar entity e migrations Prisma
3. Criar módulo SwapRequests seguindo clean architecture
4. Implementar endpoints conforme contracts
5. Adicionar testes unitários