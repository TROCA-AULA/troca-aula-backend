# Detalhamento de Endpoints

## Autenticacao

### POST /auth/login

Login de usuario no sistema.

**Headers**: Nao requer autenticacao

**Body**:
```json
{
  "email": "usuario@escola.com",
  "password": "senha123"
}
```

**Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": null,
  "message": "Login realizado com sucesso",
  "statusCode": 200
}
```

**Erros**:
- 401: Credenciais invalidas

---

## Swap Requests (Troca de Aulas)

### POST /swap-requests

Criar uma nova solicitacao de troca de aula.

**Headers**: `Authorization: Bearer <token>`

**Authorization**: Apenas perfil **DIRETOR** ou **AUXILIAR_ADMIN**

**Body**:
```json
{
  "classId": 1,
  "targetId": 2
}
```

**Response (201)**:
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "requesterId": 3,
    "targetId": 2,
    "status": "PENDING",
    "createdAt": "2026-05-14T10:00:00Z",
    "updatedAt": "2026-05-14T10:00:00Z"
  },
  "message": "Solicitacao criada com sucesso",
  "statusCode": 201
}
```

**Erros**:
- 400: Conflito de horario detectado
- 403: Apenas diretor/admin pode criar
- 404: Aula ou professor nao encontrado

---

### GET /swap-requests

Listar solicitacoes de troca com filtros.

**Headers**: `Authorization: Bearer <token>`

**Query Params** (opcionais):
| Parametro | Tipo | Descricao |
|-----------|------|------------|
| status | string | PENDING, APPROVED, REJECTED, CANCELLED |
| type | string | "created" (criadas por mim) ou "received" (recebidas) |

**Exemplo**:
```
GET /swap-requests?status=PENDING&type=received
```

**Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "classId": 1,
      "requesterId": 3,
      "targetId": 2,
      "status": "PENDING",
      "createdAt": "2026-05-14T10:00:00Z"
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### GET /swap-requests/:id

Detalhar uma solicitacao especifica.

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "requesterId": 3,
    "targetId": 2,
    "status": "PENDING",
    "createdAt": "2026-05-14T10:00:00Z",
    "updatedAt": "2026-05-14T10:00:00Z"
  },
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### PATCH /swap-requests/:id/accept

Aceitar uma solicitacao de troca.

**Authorization**: Apenas professor da **mesma materia** da aula

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "APPROVED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitacao aceita",
  "statusCode": 200
}
```

**Erros**:
- 400: Solicitacao nao esta pendente
- 403: Apenas professor替代 pode aceitar / Voce so pode aceitar aulas da sua materia

---

### PATCH /swap-requests/:id/reject

Rejeitar uma solicitacao de troca.

**Authorization**: Apenas professor替代

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "REJECTED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitacao rejeitada",
  "statusCode": 200
}
```

---

### PATCH /swap-requests/:id/cancel

Cancelar uma solicitacao de troca.

**Authorization**: Apenas criador da solicitacao (requester)

**Condicao**: Apenas se status = PENDING

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "CANCELLED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitacao cancelada",
  "statusCode": 200
}
```

---

## Classes (Aulas/Turmas)

### GET /classes

Listar todas as aulas.

**Query Params**:
| Parametro | Tipo | Descricao |
|-----------|------|------------|
| schoolId | number | Filtrar por escola |
| userId | number | Filtrar por professor |

**Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "schoolId": 1,
      "subjectId": 1,
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "09:00"
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### POST /classes/:id/enroll

Professor se increver em uma aula.

**Authorization**: Qualquer professor autenticado

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "enrolledById": 2
  },
  "message": "Inscricao realizada",
  "statusCode": 200
}
```

**Erros**:
- 400: Aula ja esta inscrita por outro professor / Voce ja esta inscrito

---

### DELETE /classes/:id/enroll

Cancelar inscricao em uma aula.

**Authorization**: Apenas professor inscrito

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "enrolledById": null
  },
  "message": "Inscricao cancelada",
  "statusCode": 200
}
```

---

## Schools (Escolas)

### GET /schools

Listar escolas.

**Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Escola Primary"
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### POST /schools

Criar escola.

**Body**:
```json
{
  "name": "Escola Nova"
}
```

---

## Subjects (Disciplinas)

### GET /subjects

Listar disciplinas.

**Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Matematica"
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

## Users (Usuarios)

### GET /users

Listar usuarios.

**Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Joao Silva",
      "email": "joao@escola.com",
      "subjectId": 1
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### POST /users

Criar usuario.

**Body**:
```json
{
  "name": "Maria Santos",
  "email": "maria@escola.com",
  "phone": "11999999999",
  "password": "senha123",
  "schoolId": 1,
  "profileId": 2,
  "subjectId": 1
}
```

---

## Profiles (Perfis)

### GET /profiles

Listar perfis disponiveis.

**Response (200)**:
```json
{
  "data": [
    { "id": 1, "name": "DIRETOR" },
    { "id": 2, "name": "PROFESSOR" },
    { "id": 3, "name": "AUXILIAR_ADMIN" }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

## Status Codes - Resumo

| Endpoint | Metodo | Authorization | Descricao |
|----------|--------|---------------|------------|
| /auth/login | POST | None | Login |
| /swap-requests | POST | DIRETOR/ADMIN | Criar troca |
| /swap-requests | GET | JWT | Listar |
| /swap-requests/:id | GET | JWT | Detalhar |
| /swap-requests/:id/accept | PATCH | PROFESSOR da materia | Aceitar |
| /swap-requests/:id/reject | PATCH | PROFESSOR替代 | Rejeitar |
| /swap-requests/:id/cancel | PATCH | Criador (se PENDING) | Cancelar |
| /classes/:id/enroll | POST | PROFESSOR | Inscrever |
| /classes/:id/enroll | DELETE | PROFESSOR inscrito | Cancelar |