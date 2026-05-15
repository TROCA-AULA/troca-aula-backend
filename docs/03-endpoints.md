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

## Enrollment Requests (Inscricao com Aprovacao)

### POST /enrollment-requests/request/:classId

Professor solicita inscricao em uma aula disponivel.

**Headers**: `Authorization: Bearer <token>`

**Authorization**: Apenas professor autenticado

**Response (201)**:
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "professorId": 2,
    "status": "PENDING",
    "createdAt": "2026-05-14T10:00:00Z",
    "updatedAt": "2026-05-14T10:00:00Z"
  },
  "message": "Solicitacao criada com sucesso",
  "statusCode": 201
}
```

**Erros**:
- 400: Aula nao esta disponivel / Ja existe solicitacao pendente / Conflito de horario
- 403: Você so pode se candidatar a aulas da sua materia
- 404: Aula ou professor nao encontrado

---

### GET /enrollment-requests

Listar solicitacoes de inscricao.

**Headers**: `Authorization: Bearer <token>`

**Authorization**: 
- **DIRETOR/AUXILIAR_ADMIN**: ve todas as solicitacoes da escola
- **PROFESSOR**: ve apenas suas proprias solicitacoes

**Query Params** (opcionais):
| Parametro | Tipo | Descricao |
|-----------|------|------------|
| status | string | PENDING, APPROVED, REJECTED, CANCELLED |
| classId | number | Filtrar por aula |
| professorId | number | Filtrar por professor |

**Exemplo**:
```
GET /enrollment-requests?status=PENDING
```

**Response (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "classId": 1,
      "professorId": 2,
      "status": "PENDING",
      "createdAt": "2026-05-14T10:00:00Z"
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### GET /enrollment-requests/:id

Detalhar uma solicitacao especifica.

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "professorId": 2,
    "status": "PENDING",
    "createdAt": "2026-05-14T10:00:00Z",
    "updatedAt": "2026-05-14T10:00:00Z"
  },
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### PATCH /enrollment-requests/:id/approve

Diretor aprova uma solicitacao de inscricao.

**Authorization**: Apenas **DIRETOR** ou **AUXILIAR_ADMIN** da escola da aula

**Efeito**: 
- Professor e vinculado a aula (`enrolledById`)
- Aula deixa de estar disponivel (`available = false`)

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "APPROVED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitacao aprovada",
  "statusCode": 200
}
```

**Erros**:
- 400: Solicitacao nao esta pendente
- 403: Apenas diretor da escola pode aprovar

---

### PATCH /enrollment-requests/:id/reject

Diretor rejeita uma solicitacao de inscricao.

**Authorization**: Apenas **DIRETOR** ou **AUXILIAR_ADMIN** da escola da aula

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

**Erros**:
- 400: Solicitacao nao esta pendente
- 403: Apenas diretor da escola pode rejeitar

---

### DELETE /enrollment-requests/:id

Cancelar uma solicitacao de inscricao.

**Authorization**: Apenas professor que criou a solicitacao

**Casos**:
- Se PENDING: apenas cancela a solicitacao
- Se APPROVED: cancela e libera a aula (available=true, enrolledById=null)

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
| available | boolean | Filtrar por disponibilidade (true/false) |

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
      "endTime": "09:00",
      "available": true,
      "enrolledById": null
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### POST /classes

Criar uma nova aula.

**Headers**: `Authorization: Bearer <token>`

**Authorization**: **DIRETOR** ou **AUXILIAR_ADMIN**

**Body**:
```json
{
  "schoolId": 1,
  "subjectId": 1,
  "createdByd": 1,
  "statededAt": "2026-05-01T00:00:00Z",
  "finishedAt": "2026-12-31T00:00:00Z"
}
```

**Response (201)**:
```json
{
  "data": {
    "id": 1,
    "schoolId": 1,
    "subjectId": 1,
    "available": true,
    "createdAt": "2026-05-14T10:00:00Z"
  },
  "message": "Aula criada com sucesso",
  "statusCode": 201
}
```

---

### GET /classes/:id

Detalhar uma aula especifica.

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "schoolId": 1,
    "subjectId": 1,
    "dayOfWeek": 1,
    "startTime": "08:00",
    "endTime": "09:00",
    "available": false,
    "enrolledById": 2
  },
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### PATCH /classes/:id

Atualizar uma aula.

**Authorization**: **DIRETOR** ou **AUXILIAR_ADMIN**

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Aula atualizada",
  "statusCode": 200
}
```

---

### DELETE /classes/:id

Excluir uma aula.

**Authorization**: **DIRETOR** ou **AUXILIAR_ADMIN**

**Response (200)**:
```json
{
  "data": null,
  "message": "Aula excluida",
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

### GET /schools/:id

Detalhar escola.

---

### PATCH /schools/:id

Atualizar escola.

---

### DELETE /schools/:id

Excluir escola.

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

### POST /subjects

Criar disciplina.

**Body**:
```json
{
  "name": "Historia"
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

### GET /profile

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
| /enrollment-requests/request/:classId | POST | PROFESSOR | Solicitar inscricao |
| /enrollment-requests | GET | JWT | Listar solicitacoes |
| /enrollment-requests/:id | GET | JWT | Detalhar solicitacao |
| /enrollment-requests/:id/approve | PATCH | DIRETOR | Aprovar inscricao |
| /enrollment-requests/:id/reject | PATCH | DIRETOR | Rejeitar inscricao |
| /enrollment-requests/:id | DELETE | PROFESSOR | Cancelar solicitacao |
| /classes | GET | JWT | Listar aulas |
| /classes | POST | DIRETOR | Criar aula |
| /classes/:id | GET | JWT | Detalhar aula |
| /classes/:id | PATCH | DIRETOR | Atualizar aula |
| /classes/:id | DELETE | DIRETOR | Excluir aula |
| /schools | GET/POST | JWT | Listar/Criar escolas |
| /subjects | GET/POST | JWT | Listar/Criar disciplinas |
| /users | GET/POST | JWT | Listar/Criar usuarios |
| /profile | GET | JWT | Listar perfis |