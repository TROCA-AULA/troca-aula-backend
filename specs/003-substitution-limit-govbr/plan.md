# Implementation Plan: Substitution Limit + Gov.br Integration

**Branch**: `main` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-substitution-limit-govbr/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementação de duas pendências: P1 - Controle de limite de substituições por escola (campo em Schools, verificação no enrollment) e P2 - Endpoint Gov.br (retorna "recurso em desenvolvimento"). Ambas funcionalidades já implementadas e testadas.

## Technical Context

**Language/Version**: TypeScript 5.7.3

**Primary Dependencies**: NestJS 11, Prisma 6.7, PostgreSQL, JWT

**Storage**: PostgreSQL via Prisma ORM

**Testing**: Jest (configurado no projeto)

**Target Platform**: Linux server (Docker)

**Project Type**: web-service (REST API)

**Performance Goals**: N/A - funcionalidade de baixo volume

**Constraints**: N/A

**Scale/Scope**: Aplicação acadêmica - escala pequena

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Simplicity First (YAGNI) | ✅ PASS | Funcionalidades implementadas de forma mínima - P1 apenas verifica contagem, P2 retorna erro fixo |
| Clean Architecture | ✅ PASS | Estrutura Controller → Service → Repository mantida |
| REST API Conventions | ✅ PASS | Endpoints seguem convenções REST |
| Security Essentials | ✅ PASS | JWT continua funcionando, senhas não expostas |
| Git Workflow | ✅ PASS | Commits devem seguir conventional commits |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts    # Added login-govbr endpoint
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── enrollment-requests/
│   │   ├── enrollment-requests.service.ts  # Added limit check
│   │   ├── enrollment-requests.repository.ts
│   │   └── enrollment-requests.module.ts
│   ├── schools/
│   ├── users/
│   ├── subjects/
│   ├── classes/
│   └── profile/
├── config/
├── prisma.service.ts
├── app.module.ts
└── main.ts

prisma/
├── schema.prisma              # Added substitutionLimitPerSemester field
└── migrations/
    └── 20260516190846_add_substitution_limit/
```

**Structure Decision**: Estrutura existente mantida. Novas implementações seguem o padrão Controller → Service → Repository do projeto.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Não há violações da constituição. Funcionalidades implementadas de forma simples seguindo YAGNI.

## Phase 0: Research

[Feature já implementada - sem NEEDS CLARIFICATION]

## Phase 1: Design & Contracts

### Artefatos Gerados

| Artefato | Status | Caminho |
|----------|--------|---------|
| data-model.md | ✅ Criado | specs/003-substitution-limit-govbr/data-model.md |
| contracts/api.md | ✅ Atualizado | docs/10-contratos-api.md |
| quickstart.md | N/A | Funcionalidade não requer setup |

## Implementation Notes

### P1 - Controle de Limite de Substituições
- Campo `substitutionLimitPerSemester` adicionado ao modelo Schools (schema.prisma)
- Verificação implementada no método `create()` do EnrollmentRequestsService
- Contagem de substituições APROVADAS feita via Prisma count
- Migration aplicada automaticamente

### P2 - Integração Gov.br
- Endpoint POST /auth/login-govbr implementado
- Retorna 401 com "Recurso em desenvolvimento"
- Pronto para implementação completa futura
