# Task List: Implementacao do Sistema de Inscricao com Aprovacao

**Specification**: `specs/02-enrollment-approval/spec.md`

**Implementation Plan**: `specs/02-enrollment-approval/plan.md`

**Status**: Ready

---

## Phase 1: Schema e DTOs

### Task 1 - Atualizar schema.prisma
**Status**: pending

**Description**: Adicionar EnrollmentRequest ao schema.prisma + campo available em Classes

**Files**:
- `prisma/schema.prisma`

**Changes**:
```prisma
model EnrollmentRequest {
  id          Int       @id @default(autoincrement())
  classId     Int
  class       Classes   @relation(fields: [classId], references: [id])
  professorId Int
  professor   Users    @relation(fields: [professorId], references: [id])
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Classes {
  // add:
  available Boolean @default(true)
  enrollmentRequests EnrollmentRequest[] @relation("classEnrollmentRequests")
}
```

**Acceptance**: Schema compila com prisma generate

---

### Task 2 - Criar migration e atualizar schema
**Status**: pending

**Description**: Criar migration para adicionar nova tabela + gerar client

**Commands**:
```bash
npx prisma migrate dev --name add_enrollment_requests
npx prisma generate
```

**Acceptance**: Migration aplicada, client gerado

---

### Task 3 - Criar DTOs de EnrollmentRequest
**Status**: pending

**Description**: Criar DTOs para create, update e filter

**Files**:
- `src/modules/enrollment-requests/dto/create-enrollment-request.dto.ts`
- `src/modules/enrollment-requests/dto/update-enrollment-request.dto.ts`
- `src/modules/enrollment-requests/dto/filter-enrollment-request.dto.ts`

**Acceptance**: DTOs criados com class-validator

---

## Phase 2: Modulo EnrollmentRequest

### Task 4 - Criar EnrollmentRequest Service
**Status**: pending

**Description**: Implementar servico com metodos: create, findAll, approve, reject, cancel

**File**: `src/modules/enrollment-requests/enrollment-requests.service.ts`

**Methods**:
- create(classId, professorId): EnrollmentRequest
- findAll(filters): EnrollmentRequest[]
- approve(requestId): EnrollmentRequest
- reject(requestId): EnrollmentRequest
- cancel(requestId, professorId): EnrollmentRequest

**Acceptance**: Service compila, metodos implementados

---

### Task 5 - Criar EnrollmentRequest Controller
**Status**: pending

**Description**: Criar controller com endpoints REST

**File**: `src/modules/enrollment-requests/enrollment-requests.controller.ts`

**Endpoints**:
- POST /enrollment-requests/request/:classId
- GET /enrollment-requests
- PATCH /enrollment-requests/:id/approve
- PATCH /enrollment-requests/:id/reject
- DELETE /enrollment-requests/:id

**Acceptance**: Controller compila, endpoints respondem

---

### Task 6 - Criar Modulo e testar importacao
**Status**: pending

**Description**: Criar modulo e adicionar ao app.module

**Files**:
- `src/modules/enrollment-requests/enrollment-requests.module.ts`
- `src/app.module.ts`

**Acceptance**: Modulo importado, app compila

---

### Task 7 - Criar testes unitarios
**Status**: pending

**Description**: Criar testes para service

**Files**:
- `src/modules/enrollment-requests/enrollment-requests.service.spec.ts`

**Acceptance**: Testes passam

---

## Phase 3: Integracao e Ajustes

### Task 8 - Ajustar ClassesService para novo fluxo
**Status**: pending

**Description**: Integrar EnrollmentRequest no fluxo de Classes

**File**: `src/modules/classes/classes.service.ts`

**Changes**:
- addAvailableToClassQuery
- handleEnrollmentApproved

**Acceptance**: Classes compila

---

### Task 9 - Criar endpoint enrollment em Classes
**Status**: pending

**Description**: Adicionar route em ClassesController para solicitar inscricao

**File**: `src/modules/classes/classes.controller.ts`

**Endpoint**:
- POST /classes/:id/enroll

**Acceptance**: Endpoint responde

---

### Task 10 - Adicionar filtros em Classes
**Status**: pending

**Description**: Adicionar filtro available em listagem de classes

**Changes**: classes.service.ts findAll + ClassesQueryDto

**Acceptance**: Filtro funciona

---

## Phase 4: Cleanup e Testes

### Task 11 - Remover SwapRequests
**Status**: pending

**Description**: Remover modulo SwapRequests inteiramente

**Files to remove**:
- `src/modules/swap-requests/`
- References em app.module.ts

**Acceptance**: Compila sem swap-requests

---

### Task 12 - Run tests
**Status**: pending

**Command**: npm run test

**Acceptance**: Todos testes passam

---

### Task 13 - Build
**Status**: pending

**Command**: npm run build

**Acceptance**: Build passando

---

## Excluded from scope

- Frontend alterations
- Notificacoes email/push
- Historico detalhado deauditoria
- Rate limiting