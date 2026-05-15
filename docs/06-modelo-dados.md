# Modelo de Dados

## Visao Geral do Banco

O banco de dados PostgreSQL e gerenciado pelo **Prisma ORM** e contem todas as entidades do sistema Troca Aula.

---

## Diagrama de Entidades

```mermaid
erDiagram
    Users ||--o{ UsersProfilesSchools : "vinculos"
    Users ||--o{ Classes : "cria"
    Users ||--o{ Classes : "registra"
    Users ||--o{ Classes : "aprova"
    Users ||--o{ Classes : "inscrito"
    Users ||--o{ SwapRequests : "solicita"
    Users ||--o{ SwapRequests : "target"
    Schools ||--o{ UsersProfilesSchools : "tem_usuarios"
    Schools ||--o{ Classes : "tem_aulas"
    Profiles ||--o{ UsersProfilesSchools : "atribuidos"
    Profiles ||--o{ Classes : "perfil_aula"
    Subjects ||--o{ Classes : "disciplina"
    Subjects ||--o{ Users : "professor"
    Classes ||--o{ SwapRequests : "trocas"
```

---

## Tabelas do Banco

### Users (Usuarios)

Armazena informacoes dos usuarios do sistema.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| name | String | Sim | Nome completo |
| email | String | Sim, unico | Email (login) |
| phone | String | Sim | Telefone |
| password | String | Sim | Senha hasheada |
| subjectId | Int | Nao | Materia que leciona |
| createdAt | DateTime | Sim | Data de criacao |
| deletedAt | DateTime | Nao | Data de exclusao |

**Indices**:
- email (unico)

---

### Schools (Escolas)

Armazena as instituicoes de ensino.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| name | String | Sim | Nome da escola |
| createdAt | DateTime | Sim | Data de criacao |
| deletedAt | DateTime | Nao | Data de exclusao |

---

### Subjects (Disciplinas)

Armazena as materias/disciplinas oferecidas.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| name | String | Sim | Nome da disciplina |
| createdAt | DateTime | Sim | Data de criacao |
| deletedAt | DateTime | Nao | Data de exclusao |

---

### Profiles (Perfis)

Define os tipos de usuarios no sistema.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| name | String | Sim | Nome do perfil |
| createdAt | DateTime | Sim | Data de criacao |

**Perfis disponiveis**:
- DIRETOR (id: 1)
- PROFESSOR (id: 2)
- AUXILIAR_ADMIN (id: 3)

---

### Classes (Aulas/Turmas)

Armazena as aulas cadastradas no sistema.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| schoolId | Int | Sim | FK para Schools |
| subjectId | Int | Sim | FK para Subjects |
| createdByd | Int | Sim | FK para Users (criador) |
| registredById | Int | Nao | FK para Users (registrador) |
| approvedById | Int | Nao | FK para Users (aprovador) |
| profileId | Int | Nao | FK para Profiles |
| createdAt | DateTime | Sim | Data de criacao |
| finishedAt | DateTime | Nao | Data de termino |
| deletedAt | DateTime | Nao | Data de exclusao |
| statededAt | DateTime | Nao | Data de inicio |
| approvedAt | DateTime | Nao | Data de aprovacao |
| dayOfWeek | Int | Nao | Dia (1-7, 1=segunda) |
| startTime | String | Nao | Horario inicio (HH:MM) |
| endTime | String | Nao | Horario fim (HH:MM) |
| enrolledById | Int | Nao | FK para Users (inscrito) |

**Indices**:
- schoolId
- subjectId
- createdByd

---

### UsersProfilesSchools

Tabela de vinculo multiplos: Usuario <-> Perfil <-> Escola.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| userId | Int | Sim | FK para Users |
| profileId | Int | Sim | FK para Profiles |
| schoolId | Int | Sim | FK para Schools |
| createdAt | DateTime | Sim | Data de criacao |
| approvedAt | DateTime | Nao | Data de aprovacao |
| approvedById | Int | Nao | FK para Users (aprovador) |

**Chave primaria composta**: (userId, profileId, schoolId)

**Indices**:
- userId
- profileId
- schoolId

---

### SwapRequests (Solicitacoes de Troca)

Armazena as solicitacoes de troca de aulas.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| classId | Int | Sim | FK para Classes |
| requesterId | Int | Sim | FK para Users (criador) |
| targetId | Int | Sim | FK para Users (professor替代) |
| status | String | Sim | PENDING, APPROVED, REJECTED, CANCELLED |
| createdAt | DateTime | Sim | Data de criacao |
| updatedAt | DateTime | Sim | Data de atualizacao |

**Status possiveis**:
- PENDING: Aguardando acao
- APPROVED: Aceita pelo professor替代
- REJECTED: Rejeitada pelo professor替代
- CANCELLED: Cancelada pelo criador

**Indices**:
- classId
- requesterId
- targetId
- status

---

## Relacionamentos Detalhados

```mermaid
graph LR
    subgraph Users
        U[Users]
    end
    
    subgraph Vinculos
        UPS[UsersProfilesSchools]
    end
    
    subgraph School
        S[Schools]
    end
    
    subgraph Profile
        P[Profiles]
    end
    
    U --"upsUser"--> UPS
    S --"upsSchool"--> UPS
    P --"upsProfile"--> UPS
```

---

## Queries Comuns (Prisma)

### Buscar usuario com vinculos

```typescript
const user = await prisma.users.findUnique({
  where: { id: 1 },
  include: {
    upsUser: {
      include: {
        profile: true,
        school: true
      }
    }
  }
});
```

### Buscar aulas com conflito de horario

```typescript
const conflictingClasses = await prisma.classes.findMany({
  where: {
    OR: [
      { enrolledById: targetId },
      { createdByd: targetId }
    ],
    dayOfWeek: dayOfWeek,
    deletedAt: null
  }
});
```

### Criar SwapRequest

```typescript
const swapRequest = await prisma.swapRequests.create({
  data: {
    class: { connect: { id: classId } },
    requester: { connect: { id: userId } },
    target: { connect: { id: targetId } },
    status: 'PENDING'
  }
});
```

---

## Migracoes

O banco e versionado via Prisma Migrate:

```bash
# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em producao
npx prisma migrate deploy

# Resetar banco (desenvolvimento)
npx prisma migrate reset
```

---

## Schema Prisma Completo

O arquivo completo esta em `prisma/schema.prisma` e contem todas as definicoes de modelos, relacoes e indices.