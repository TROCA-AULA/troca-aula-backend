# API Contracts: Sistema de Troca de Aulas

## Endpoints

### 1. POST /swap-requests

Criar solicitação de troca de aula.

**Headers**: `Authorization: Bearer <token>`

**Authorization**: Apenas perfil DIRETOR ou AUXILIAR_ADMIN

**Request Body**:
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
  "message": "Solicitação criada com sucesso",
  "statusCode": 201
}
```

**Response (400 - Conflito)**:
```json
{
  "message": "Conflito de horário detectado",
  "statusCode": 400
}
```

**Response (403 - Não autorizado)**:
```json
{
  "message": "Apenas diretor ou admin pode criar solicitação",
  "statusCode": 403
}
```

---

### 2. GET /swap-requests

Listar solicitações com filtros opcionais.

**Headers**: `Authorization: Bearer <token>`

**Query Params** (opcionais):
- `status` (string): PENDING, APPROVED, REJECTED, CANCELLED
- `type` (string): "created" (criadas por mim) | "received" (recebidas para mim)

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
      "createdAt": "2026-05-14T10:00:00Z",
      "updatedAt": "2026-05-14T10:00:00Z"
    }
  ],
  "message": "Sucesso",
  "statusCode": 200
}
```

---

### 3. GET /swap-requests/:id

Detalhar uma solicitação específica.

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

### 4. PATCH /swap-requests/:id/accept

Aceitar uma solicitação.

**Authorization**: Apenas professor da mesma matéria da class (class.subjectId = target.materia)

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "APPROVED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitação aceita",
  "statusCode": 200
}
```

---

### 5. PATCH /swap-requests/:id/reject

Rejeitar uma solicitação.

**Authorization**: Apenas professor da mesma matéria da class

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "REJECTED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitação rejeitada",
  "statusCode": 200
}
```

---

### 6. PATCH /swap-requests/:id/cancel

Cancelar uma solicitação.

**Authorization**: Apenas criador da solicitação (requesterId), apenas se status = PENDING

**Response (200)**:
```json
{
  "data": {
    "id": 1,
    "status": "CANCELLED",
    "updatedAt": "2026-05-14T11:00:00Z"
  },
  "message": "Solicitação cancelada",
  "statusCode": 200
}
```

---

## Códigos de Erro

| Código | Descrição |
|--------|------------|
| 400 | Erro de validação ou conflito |
| 401 | Não autenticado |
| 403 | Não autorizado |
| 404 | Solicitação não encontrada |
| 500 | Erro interno |