# API Contracts: Substitution Limit + Gov.br Integration

## Contracts Location

All API contracts for this feature are documented in:

**`docs/10-contratos-api.md`**

## New Endpoints Added

### POST /auth/login-govbr

**Status**: Implemented (placeholder - returns "Recurso em desenvolvimento")

**Endpoint**: `POST /auth/login-govbr`

**Auth**: None

**Request Body**:
```json
{
  "token": "string"
}
```

**Response (401)**:
```json
{
  "statusCode": 401,
  "message": "Recurso em desenvolvimento",
  "error": "Unauthorized"
}
```

## Updated Endpoints

### POST /schools (Updated)

**New Field**: `substitutionLimitPerSemester` (optional)

**Request Body**:
```json
{
  "name": "string",
  "substitutionLimitPerSemester": 10
}
```

### POST /enrollment-requests/request/:classId (Updated)

**New Behavior**: Checks substitution limit before creating request

**Error Response (400)**:
```json
{
  "statusCode": 400,
  "message": "Limite de substituições atingido para este semestre (10 limite)",
  "error": "Bad Request"
}
```

## Existing Contracts

All other contracts remain unchanged. See `docs/10-contratos-api.md` for complete API documentation.