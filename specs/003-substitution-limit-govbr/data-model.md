# Data Model: Substitution Limit + Gov.br Integration

## Entities

### Schools (Atualizado)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Int | Yes | Primary key |
| name | String | Yes | School name |
| substitutionLimitPerSemester | Int? | No | Maximum substitutions per semester (null = no limit) |
| createdAt | DateTime | Yes | Creation timestamp |
| deletedAt | DateTime? | No | Soft delete timestamp |

**Relationships**:
- Has many Classes
- Has many UsersProfilesSchools

### EnrollmentRequest (Sem alterações)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Int | Yes | Primary key |
| classId | Int | Yes | Foreign key to Classes |
| professorId | Int | Yes | Foreign key to Users |
| status | String | Yes | PENDING, APPROVED, REJECTED, CANCELLED |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

**Relationships**:
- Belongs to Class
- Belongs to Professor (User)

## Validation Rules

### Substitution Limit Check
- Only applies when `Schools.substitutionLimitPerSemester` is not null and > 0
- Counts only APPROVED enrollment requests
- Blocks new enrollment when count >= limit

### Gov.br Endpoint
- Accepts `{ token: string }` payload
- Returns 401 with message "Recurso em desenvolvimento"
- No validation needed currently (placeholder)

## State Transitions

### EnrollmentRequest Status Flow
```
PENDING → APPROVED (by director)
PENDING → REJECTED (by director)
PENDING → CANCELLED (by professor)
APPROVED → [final state]
REJECTED → [final state]
CANCELLED → [final state]
```

## Notes

- No new entities created
- Existing relationships maintained
- No state changes to existing workflows