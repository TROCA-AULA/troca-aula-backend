# Feature Specification: Sistema de Inscricao de Aulas com Aprovacao

**Feature Branch**: `feat/enrollment-approval`

**Created**: 2026-05-14

**Status**: Draft

**Input**: Sistema de inscricao de professores em aulas com aprovacao do diretor

---

## Visao Geral do Novo Fluxo

O sistema atual permite inscricao direta em aulas. O novo fluxo adiciona uma camada de aprobacao:

```
Diretor cria Aula -> Aula disponivel -> Professor solicita -> Diretor aprova/rejeita -> Professor vinculado
```

---

## Diferencas do Modelo Atual vs Novo

| Aspecto | Atual | Novo |
|---------|-------|------|
| Inscricao | Direta ( Professor se inscreve e ja linked ) | Com aprobacao |
| Historico | Nao existe | Mantem todo historico de solicitacoes |
| Cancelamento | Professor cancela diretamente | Professor cancela, mas diretor pode reativar |
| Aprovacao | Nao tem | Diretor aprova ou rejeita |

---

## User Stories & Testing

### US1 - Solicitar Inscricao em Aula (Priority: P1)

**Como** professor,
**Eu quero** solicitar inscricao em uma aula disponivel,
**Para** ser considerado como替代.

**Cenarios**:
1. **Given** aula disponivel, **When** professor solicita, **Then** solicitacao criada com status PENDING
2. **Given** aula com solicitacao pendente, **When** mesmo professor tenta novamente, **Then** erro - ja solicitou
3. **Given** aula ja vinculada a outro professor, **When** professor tenta solicitar, **Then** erro - ja ocupada

---

### US2 - Aprovar/Rejeitar Inscricao (Priority: P1)

**Como** diretor,
**Eu quero** aprobar ou rejeitar solicitacoes de inscricao,
**Para** controlar quem pode lecionar minhas aulas.

**Cenarios**:
1. **Given** solicitacao PENDING, **When** diretor aprova, **Then** professor vinculado + status APPROVED
2. **Given** solicitacao PENDING, **When** diretor rejeita, **Then** status REJECTED + professor nao vinculado
3. **Given** solicitacao ja APPROVED, **When** diretor tenta aprovar novamente, **Then** erro - ja aprovado

---

### US3 - Cancelar Inscricao pelo Professor (Priority: P2)

**Como** professor vinculado,
**Eu quero** cancelar minha inscricao,
**Para** a aula ficar disponivel para outro professor.

**Cenarios**:
1. **Given** professor vinculado, **When** cancela, **Then** enrolledById = null + aula disponivel
2. **Given** solicitacao PENDING, **When** professor cancela, **Then** status CANCELLED

---

### US4 - ListarSolicitacoes (Priority: P2)

**Como** diretor,
**Eu quero** ver todas as solicitacoes de inscricao,
**Para** gerenciar aprobacoes.

**Cenarios**:
1. **Given** diretor logado, **When** acessa listagem, **Then** ve todas solicitacoes das aulas da escola
2. **Given** solicitacoes com diferentes status, **When** filtra por status, **Then** mostra apenas correspondentes

---

## Requirements

### Functional Requirements

- **FR-001**: Sistema DEVE permitir solicitacao de inscricao em aula disponivel
- **FR-002**: Sistema DEVE criar EnrollmentRequest ao solicitar (não vinculacao direta)
- **FR-003**: Diretor DEVE poder aprobar solicitacao (vincula professor)
- **FR-004**: Diretor DEVE poder rejeitar solicitacao (não vincula)
- **FR-005**: Sistema DEVE manter historico de todas solicitacoes
- **FR-006**: Professor DEVE poder cancelar inscricao ativa (libera aula)
- **FR-007**: Sistema DEVE verificar conflitos de horario ao solicitar
- **FR-008**: Apenas diretor/admin pode criar aulas
- **FR-009**: Apenas professor da mesma materia pode solicitar

### Non-Functional Requirements

- **NFR-001**: Respostas em formato JSON padronizado
- **NFR-002**: Autenticacao JWT obrigatória
- **NFR-003**: Validacao com class-validator

---

## Data Model

### Nova Entidade: EnrollmentRequest

```prisma
model EnrollmentRequest {
  id          Int       @id @default(autoincrement())
  classId     Int
  class       Classes   @relation(fields: [classId], references: [id])
  professorId Int
  professor   Users    @relation(fields: [professorId], references: [id])
  status      String    @default("PENDING") // PENDING, APPROVED, REJECTED, CANCELLED
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([classId])
  @@index([professorId])
  @@index([status])
}
```

### Ajustes em Classes

```prisma
model Classes {
  // ...existing fields...
  available Boolean @default(true) // Aula disponivel para solicitacao
  
  enrollmentRequests EnrollmentRequest[] @relation("classEnrollmentRequests")
}
```

---

## Endpoints

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | /classes/:id/request | Solicitar inscricao | Professor |
| GET | /enrollment-requests | Listar solicitacoes | Diretor |
| PATCH | /enrollment-requests/:id/approve | Aprovar solicitacao | Diretor |
| PATCH | /enrollment-requests/:id/reject | Rejeitar solicitacao | Diretor |
| DELETE | /enrollment-requests/:id/cancel | Cancelar minha solicitacao | Professor |

---

## Assumptions

- SwapRequests sera removido (nao faz parte do novo fluxo)
- EnrollmentRequest substitui a logica de inscricao direta
- Professors podem ter subjectId definido para validacao de materia
- Conflito de horario verificado ao solicitar