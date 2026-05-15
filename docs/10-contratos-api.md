# Contratos da API —Frontend Integration

Este documento contém todos os contratos da API do Sistema Troca Aula, com exemplos de curl, payloads e respostas para integração com o frontend.

---

## Autenticação

### POST /auth/login

Realiza login no sistema e retorna token JWT.

**Curl:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "professor@escola.com", "password": "senha123"}'
```

**Payload (Request):**
```json
{
  "email": "professor@escola.com",
  "password": "senha123"
}
```

**Response (200) — Sucesso:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJwcm9mZXNzb3JAZXNjb2xhLmNvbSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDM2MDAwfQ.xxxxxxxx",
  "data": null,
  "message": "Login realizado com sucesso",
  "statusCode": 200
}
```

**Response (401) — Erro:**
```json
{
  "statusCode": 401,
  "message": "Credenciais inválidas",
  "error": "Unauthorized"
}
```

---

## Users (Usuários)

### POST /users

Cria um novo usuário no sistema.

**Curl:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao.silva@escola.com",
    "phone": "11999999999",
    "password": "senha123",
    "subjectId": 1
  }'
```

**Payload:**
```json
{
  "name": "João Silva",
  "email": "joao.silva@escola.com",
  "phone": "11999999999",
  "password": "senha123",
  "subjectId": 1
}
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "name": "João Silva",
    "email": "joao.silva@escola.com",
    "phone": "11999999999",
    "subjectId": 1,
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Usuário criado com sucesso",
  "statusCode": 201
}
```

### GET /users

Lista todos os usuários.

**Curl:**
```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao.silva@escola.com",
      "phone": "11999999999",
      "subjectId": 1,
      "createdAt": "2026-05-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Maria Santos",
      "email": "maria.santos@escola.com",
      "phone": "11888888888",
      "subjectId": 2,
      "createdAt": "2026-05-15T11:00:00.000Z"
    }
  ],
  "message": "Usuários encontrados",
  "statusCode": 200
}
```

### GET /users/:id

Busca usuário por ID.

**Curl:**
```bash
curl -X GET http://localhost:3000/users/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "João Silva",
    "email": "joao.silva@escola.com",
    "phone": "11999999999",
    "subjectId": 1,
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Usuário encontrado",
  "statusCode": 200
}
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Usuário não encontrado",
  "error": "Not Found"
}
```

### PATCH /users/:id

Atualiza usuário.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/users/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva Atualizado"}'
```

**Payload:**
```json
{
  "name": "João Silva Atualizado",
  "phone": "11999999999",
  "subjectId": 1
}
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "João Silva Atualizado",
    "email": "joao.silva@escola.com",
    "phone": "11999999999",
    "subjectId": 1,
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Usuário atualizado com sucesso",
  "statusCode": 200
}
```

### DELETE /users/:id

Remove usuário (soft delete).

**Curl:**
```bash
curl -X DELETE http://localhost:3000/users/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": null,
  "message": "Usuário removido com sucesso",
  "statusCode": 200
}
```

---

## Schools (Escolas)

### POST /schools

Cria nova escola.

**Curl:**
```bash
curl -X POST http://localhost:3000/schools \
  -H "Content-Type: application/json" \
  -d '{"name": "Escola Municipal João Paulo"}'
```

**Payload:**
```json
{
  "name": "Escola Municipal João Paulo"
}
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "name": "Escola Municipal João Paulo",
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Escola criada com sucesso",
  "statusCode": 201
}
```

### GET /schools

Lista todas as escolas.

**Curl:**
```bash
curl -X GET http://localhost:3000/schools \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Escola Municipal João Paulo",
      "createdAt": "2026-05-15T10:00:00.000Z"
    }
  ],
  "message": "Escolas encontradas",
  "statusCode": 200
}
```

### GET /schools/:id

Busca escola por ID.

**Curl:**
```bash
curl -X GET http://localhost:3000/schools/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

### PATCH /schools/:id

Atualiza escola.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/schools/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"name": "Escola Municipal Novo Nome"}'
```

### DELETE /schools/:id

Remove escola.

**Curl:**
```bash
curl -X DELETE http://localhost:3000/schools/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

---

## Subjects (Disciplinas)

### POST /subjects

Cria nova disciplina.

**Curl:**
```bash
curl -X POST http://localhost:3000/subjects \
  -H "Content-Type: application/json" \
  -d '{"name": "Matemática"}'
```

**Payload:**
```json
{
  "name": "Matemática"
}
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "name": "Matemática",
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Disciplina criada com sucesso",
  "statusCode": 201
}
```

### GET /subjects

Lista todas as disciplinas.

**Curl:**
```bash
curl -X GET http://localhost:3000/subjects \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": [
    { "id": 1, "name": "Matemática", "createdAt": "2026-05-15T10:00:00.000Z" },
    { "id": 2, "name": "Português", "createdAt": "2026-05-15T11:00:00.000Z" },
    { "id": 3, "name": "História", "createdAt": "2026-05-15T12:00:00.000Z" }
  ],
  "message": "Disciplinas encontradas",
  "statusCode": 200
}
```

### GET /subjects/:id

Busca disciplina por ID.

**Curl:**
```bash
curl -X GET http://localhost:3000/subjects/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

### PATCH /subjects/:id

Atualiza disciplina.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/subjects/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"name": "Matemática Avançada"}'
```

### DELETE /subjects/:id

Remove disciplina.

**Curl:**
```bash
curl -X DELETE http://localhost:3000/subjects/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

---

## Classes (Aulas)

### POST /classes

Cria uma nova aula (aula vaga).

**Curl:**
```bash
curl -X POST http://localhost:3000/classes \
  -H "Authorization: Bearer TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": 1,
    "subjectId": 1,
    "dayOfWeek": 2,
    "startTime": "10:00",
    "endTime": "11:00"
  }'
```

**Payload:**
```json
{
  "schoolId": 1,
  "subjectId": 1,
  "dayOfWeek": 2,
  "startTime": "10:00",
  "endTime": "11:00"
}
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "schoolId": 1,
    "subjectId": 1,
    "dayOfWeek": 2,
    "startTime": "10:00",
    "endTime": "11:00",
    "available": true,
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Aula criada com sucesso",
  "statusCode": 201
}
```

### GET /classes

Lista aulas com filtros.

**Curl:**
```bash
# Sem filtros
curl -X GET "http://localhost:3000/classes" \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"

# Com filtros
curl -X GET "http://localhost:3000/classes?schoolId=1&subjectId=1&available=true" \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|------------|
| schoolId | number | Filtrar por escola |
| subjectId | number | Filtrar por disciplina |
| available | boolean | Filtrar por disponibilidade |
| dayOfWeek | number | Filtrar por dia (1-7) |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "schoolId": 1,
      "subjectId": 1,
      "dayOfWeek": 2,
      "startTime": "10:00",
      "endTime": "11:00",
      "available": true,
      "createdAt": "2026-05-15T10:00:00.000Z"
    }
  ],
  "message": "Aulas encontradas",
  "statusCode": 200
}
```

### GET /classes/:id

Busca aula por ID.

**Curl:**
```bash
curl -X GET http://localhost:3000/classes/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "schoolId": 1,
    "subjectId": 1,
    "dayOfWeek": 2,
    "startTime": "10:00",
    "endTime": "11:00",
    "available": true,
    "createdAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Aula encontrada",
  "statusCode": 200
}
```

### PATCH /classes/:id

Atualiza aula.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/classes/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"dayOfWeek": 3, "startTime": "14:00"}'
```

**Payload (exemplo):**
```json
{
  "dayOfWeek": 3,
  "startTime": "14:00",
  "endTime": "15:00"
}
```

### DELETE /classes/:id

Remove aula (soft delete).

**Curl:**
```bash
curl -X DELETE http://localhost:3000/classes/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": null,
  "message": "Aula removida com sucesso",
  "statusCode": 200
}
```

### POST /classes/:id/enroll

Inscreve professor na aula.

**Curl:**
```bash
curl -X POST http://localhost:3000/classes/1/enroll \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "professorId": 2,
    "status": "PENDING",
    "createdAt": "2026-05-15T10:00:00.000Z",
    "updatedAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Inscrição realizada com sucesso",
  "statusCode": 201
}
```

**Erros possíveis:**
- 400: "Aula não está disponível" / "Você já está inscrito nesta aula"
- 403: "Você só pode se candidatar a aulas da sua matéria"

### DELETE /classes/:id/enroll

Cancela inscrição do professor na aula.

**Curl:**
```bash
curl -X DELETE http://localhost:3000/classes/1/enroll \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": null,
  "message": "Inscrição cancelada com sucesso",
  "statusCode": 200
}
```

---

## Enrollment Requests (Candidaturas)

### POST /enrollment-requests/request/:classId

Professor solicita inscrição em uma aula vaga.

**Curl:**
```bash
curl -X POST http://localhost:3000/enrollment-requests/request/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "professorId": 2,
    "status": "PENDING",
    "createdAt": "2026-05-15T10:00:00.000Z",
    "updatedAt": "2026-05-15T10:00:00.000Z"
  },
  "message": "Candidatura criada com sucesso",
  "statusCode": 201
}
```

**Erros:**
- 400: "Aula não disponível" / "Já existe candidatura pendente" / "Conflito de horário detectado"
- 403: "Você só pode se candidatar a aulas da sua matéria"
- 404: "Aula não encontrada"

### GET /enrollment-requests

Lista candidaturas.

**Curl:**
```bash
# Todas as candidaturas
curl -X GET "http://localhost:3000/enrollment-requests" \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"

# Com filtro de status
curl -X GET "http://localhost:3000/enrollment-requests?status=PENDING" \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|------------|
| status | string | PENDING, APPROVED, REJECTED, CANCELLED |
| classId | number | Filtrar por aula |
| professorId | number | Filtrar por professor |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "classId": 1,
      "professorId": 2,
      "status": "PENDING",
      "createdAt": "2026-05-15T10:00:00.000Z",
      "updatedAt": "2026-05-15T10:00:00.000Z"
    }
  ],
  "message": "Candidaturas encontradas",
  "statusCode": 200
}
```

### GET /enrollment-requests/:id

Busca candidatura por ID.

**Curl:**
```bash
curl -X GET http://localhost:3000/enrollment-requests/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

### PATCH /enrollment-requests/:id/approve

Diretor aprova candidatura.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/enrollment-requests/1/approve \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "professorId": 2,
    "status": "APPROVED",
    "createdAt": "2026-05-15T10:00:00.000Z",
    "updatedAt": "2026-05-15T10:05:00.000Z"
  },
  "message": "Candidatura aprovada com sucesso",
  "statusCode": 200
}
```

**Erros:**
- 403: "Apenas diretor pode executar esta ação"
- 400: "Candidatura não está pendente"

### PATCH /enrollment-requests/:id/reject

Diretor rejeita candidatura.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/enrollment-requests/1/reject \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "classId": 1,
    "professorId": 2,
    "status": "REJECTED",
    "createdAt": "2026-05-15T10:00:00.000Z",
    "updatedAt": "2026-05-15T10:05:00.000Z"
  },
  "message": "Candidatura rejeitada",
  "statusCode": 200
}
```

### DELETE /enrollment-requests/:id

Cancela candidatura.

**Curl:**
```bash
curl -X DELETE http://localhost:3000/enrollment-requests/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

**Response (200):**
```json
{
  "data": null,
  "message": "Candidatura cancelada com sucesso",
  "statusCode": 200
}
```

---

## Profiles (Perfis)

### POST /profile

Cria novo perfil.

**Curl:**
```bash
curl -X POST http://localhost:3000/profile \
  -H "Content-Type: application/json" \
  -d '{"name": "DIRETOR", "description": "Perfil de diretor"}'
```

**Payload:**
```json
{
  "name": "DIRETOR",
  "description": "Perfil de diretor"
}
```

### GET /profile

Lista todos os perfis.

**Curl:**
```bash
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

### GET /profile/:id

Busca perfil por ID.

**Curl:**
```bash
curl -X GET http://localhost:3000/profile/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

### PATCH /profile/:id

Atualiza perfil.

**Curl:**
```bash
curl -X PATCH http://localhost:3000/profile/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"name": "DIRETOR ESCOLA"}'
```

### DELETE /profile/:id

Remove perfil.

**Curl:**
```bash
curl -X DELETE http://localhost:3000/profile/1 \
  -H "Authorization: Bearer TOKEN_JWT_AQUI"
```

---

## Tabela de Endpoints Resumo

| Módulo | Método | Endpoint | Auth | Descrição |
|--------|--------|----------|------|------------|
| Auth | POST | /auth/login | ❌ | Login |
| Users | GET | /users | ✅ | Lista usuários |
| Users | POST | /users | ❌ | Cria usuário |
| Users | GET | /users/:id | ✅ | Busca usuário |
| Users | PATCH | /users/:id | ✅ | Atualiza usuário |
| Users | DELETE | /users/:id | ✅ | Remove usuário |
| Schools | GET | /schools | ✅ | Lista escolas |
| Schools | POST | /schools | ❌ | Cria escola |
| Schools | GET | /schools/:id | ✅ | Busca escola |
| Schools | PATCH | /schools/:id | ✅ | Atualiza escola |
| Schools | DELETE | /schools/:id | ✅ | Remove escola |
| Subjects | GET | /subjects | ✅ | Lista disciplinas |
| Subjects | POST | /subjects | ❌ | Cria disciplina |
| Subjects | GET | /subjects/:id | ✅ | Busca disciplina |
| Subjects | PATCH | /subjects/:id | ✅ | Atualiza disciplina |
| Subjects | DELETE | /subjects/:id | ✅ | Remove disciplina |
| Classes | GET | /classes | ✅ | Lista aulas |
| Classes | POST | /classes | ✅ | Cria aula |
| Classes | GET | /classes/:id | ✅ | Busca aula |
| Classes | PATCH | /classes/:id | ✅ | Atualiza aula |
| Classes | DELETE | /classes/:id | ✅ | Remove aula |
| Classes | POST | /classes/:id/enroll | ✅ | Inscreve professor |
| Classes | DELETE | /classes/:id/enroll | ✅ | Cancela inscrição |
| Enrollment | GET | /enrollment-requests | ✅ | Lista candidaturas |
| Enrollment | POST | /enrollment-requests/request/:classId | ✅ | Cria candidatura |
| Enrollment | GET | /enrollment-requests/:id | ✅ | Busca candidatura |
| Enrollment | PATCH | /enrollment-requests/:id/approve | ✅ | Aprova candidatura |
| Enrollment | PATCH | /enrollment-requests/:id/reject | ✅ | Rejeita candidatura |
| Enrollment | DELETE | /enrollment-requests/:id | ✅ | Cancela candidatura |
| Profile | GET | /profile | ✅ | Lista perfis |
| Profile | POST | /profile | ❌ | Cria perfil |
| Profile | GET | /profile/:id | ✅ | Busca perfil |
| Profile | PATCH | /profile/:id | ✅ | Atualiza perfil |
| Profile | DELETE | /profile/:id | ✅ | Remove perfil |

---

## Headers Comuns

Para todas as rotas autenticadas (exceto login, users e schools):

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Erro de validação / dados inválidos |
| 401 | Não autenticado |
| 403 | Não autorizado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |