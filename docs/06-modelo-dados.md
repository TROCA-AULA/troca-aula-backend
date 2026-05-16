# Modelo de Dados

## Visao Geral do Banco

O banco de dados PostgreSQL e gerenciado pelo **Prisma ORM** e contem todas as entidades do sistema Troca Aula.

---

## Arquitetura do Banco de Dados

```mermaid
graph TB
    subgraph "Camada de Aplicação"
        APP[NestJS API]
    end
    
    subgraph "Camada de Persistência"
        PRISMA[Prisma Client]
        MIGRATE[Prisma Migrate]
    end
    
    subgraph "PostgreSQL"
        POOL[Connection Pool]
        MAIN[(Banco Principal)]
        REPLICA[(Replicado<br/>Somente Leitura)]
    end
    
    subgraph "Administração"
        PGADMIN[pgAdmin]
        CLI[CLI Prisma]
    end
    
    APP --> PRISMA
    PRISMA --> POOL
    POOL --> MAIN
    MAIN -->|Replicacao| REPLICA
    MIGRATE --> MAIN
    CLI --> PRISMA
    PGADMIN --> MAIN
```

### Modelo Relacional Completo

```mermaid
erDiagram
    USERS ||--o{ USERS_PROFILES_SCHOOLS : "vinculos"
    USERS ||--o{ CLASSES_CREATED : "criadas_por"
    USERS ||--o{ CLASSES_APPROVED : "aprovadas_por"
    USERS ||--o{ ENROLLMENT_REQUESTS : "candidaturas"
    SCHOOLS ||--o{ USERS_PROFILES_SCHOOLS : "usuarios"
    SCHOOLS ||--o{ CLASSES : "aulas"
    PROFILES ||--o{ USERS_PROFILES_SCHOOLS : "perfis"
    SUBJECTS ||--o{ CLASSES : "disciplinas"
    SUBJECTS ||--o{ USERS : "professor_especialidade"
    CLASSES ||--o{ ENROLLMENT_REQUESTS : "inscricoes"
    
    USERS {
        int id PK
        string name
        string email UK
        string phone
        string passwordHash
        int subjectId FK
        datetime createdAt
        datetime deletedAt
    }
    
    SCHOOLS {
        int id PK
        string name
        datetime createdAt
        datetime deletedAt
    }
    
    PROFILES {
        int id PK
        string name
        string description
    }
    
    SUBJECTS {
        int id PK
        string name
        string description
    }
    
    CLASSES {
        int id PK
        int schoolId FK
        int subjectId FK
        int createdById FK
        int approvedById FK
        int dayOfWeek
        string startTime
        string endTime
        boolean isActive
        datetime createdAt
        datetime deletedAt
    }
    
    ENROLLMENT_REQUESTS {
        int id PK
        int classId FK
        int userId FK
        enum status
        datetime enrolledAt
    }
    
    USERS_PROFILES_SCHOOLS {
        int userId FK
        int profileId FK
        int schoolId FK
        datetime approvedAt
    }
```

### Diagrama de Dependencies de Entidades

```mermaid
graph TD
    subgraph "Entidades Principais"
        USER[User]
        SCHOOL[School]
        SUBJECT[Subject]
    end
    
    subgraph "Entidades de Associacao"
        UPS[UsersProfilesSchools]
        CLASS[Class]
        ENROLL[EnrollmentRequest]
    end
    
    subgraph "Entidades de Suporte"
        PROFILE[Profile]
    end
    
    USER --> UPS
    SCHOOL --> UPS
    PROFILE --> UPS
    
    USER --> CLASS
    SCHOOL --> CLASS
    SUBJECT --> CLASS
    PROFILE --> CLASS
    
    USER --> ENROLL
    CLASS --> ENROLL
    
    CLASS --> SUBJECT
    USER --> SUBJECT
```

---

## Diagrama de Entidades (Mermaid)

```mermaid
erDiagram
    Users ||--o{ UsersProfilesSchools : "vinculos"
    Users ||--o{ Classes : "cria"
    Users ||--o{ Classes : "registra"
    Users ||--o{ Classes : "aprova"
    Users ||--o{ Classes : "inscrito"
    Users ||--o{ EnrollmentRequest : "solicita"
    Schools ||--o{ UsersProfilesSchools : "tem_usuarios"
    Schools ||--o{ Classes : "tem_aulas"
    Profiles ||--o{ UsersProfilesSchools : "atribuidos"
    Profiles ||--o{ Classes : "perfil_aula"
    Subjects ||--o{ Classes : "disciplina"
    Subjects ||--o{ Users : "professor"
    Classes ||--o{ EnrollmentRequest : "inscricoes"
```

---

## Diagrama de Classes UML

```mermaid
classDiagram
    class Users {
        +Int id
        +String name
        +String email
        +String phone
        +String password
        +Int subjectId
        +DateTime createdAt
        +DateTime deletedAt
    }
    
    class Schools {
        +Int id
        +String name
        +DateTime createdAt
        +DateTime deletedAt
    }
    
    class Profiles {
        +Int id
        +String name
        +DateTime createdAt
    }
    
    class Subjects {
        +Int id
        +String name
        +DateTime createdAt
        +DateTime deletedAt
    }
    
    class Classes {
        +Int id
        +Int schoolId
        +Int subjectId
        +Int createdByd
        +Int registredById
        +Int approvedById
        +Int profileId
        +DateTime createdAt
        +DateTime finishedAt
        +DateTime deletedAt
        +DateTime statededAt
        +DateTime approvedAt
        +Int dayOfWeek
        +String startTime
        +String endTime
        +Int enrolledById
        +Boolean available
    }
    
    class UsersProfilesSchools {
        +Int userId
        +Int profileId
        +Int schoolId
        +DateTime createdAt
        +DateTime approvedAt
        +Int approvedById
    }
    
    class EnrollmentRequest {
        +Int id
        +Int classId
        +Int professorId
        +String status
        +DateTime createdAt
        +DateTime updatedAt
    }
    
    Users --o UsersProfilesSchools
    Schools --o UsersProfilesSchools
    Profiles --o UsersProfilesSchools
    
    Users --o Classes
    Schools --o Classes
    Subjects --o Classes
    Profiles --o Classes
    
    Users --o EnrollmentRequest
    Classes --o EnrollmentRequest
```

---

## Fluxo de Dados

```mermaid
flowchart TD
    subgraph "Fluxo de Inscricao"
        A[Director cria Classe] --> B{Aula disponivel?}
        B -->|Sim| C[Professor solicita]
        C --> D[EnrollmentRequest PENDING]
        D --> E{Director aprova?}
        E -->|Sim| F[Professor vinculado<br/>available=false]
        E -->|Nao| G[Status REJECTED]
        C --> H{Cancelar?}
        H -->|Sim| I[available=true<br/>enrolledById=null]
    end
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
| available | Boolean | Sim | Esta disponivel para inscricao |

**Indices**:
- schoolId
- subjectId
- createdByd
- available

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

### EnrollmentRequest (Solicitacoes de Inscricao)

Armazena as solicitacoes de inscricao em aulas.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | Int | Sim | PK auto-increment |
| classId | Int | Sim | FK para Classes |
| professorId | Int | Sim | FK para Users |
| status | String | Sim | PENDING, APPROVED, REJECTED, CANCELLED |
| createdAt | DateTime | Sim | Data de criacao |
| updatedAt | DateTime | Sim | Data de atualizacao |

**Status possiveis**:
- PENDING: Aguardando aprovacao do diretor
- APPROVED: Aprovada pelo diretor - professor vinculado
- REJECTED: Rejeitada pelo diretor
- CANCELLED: Cancelada pelo professor

**Indices**:
- classId
- professorId
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

### Buscar aulas disponiveis

```typescript
const availableClasses = await prisma.classes.findMany({
  where: {
    available: true,
    deletedAt: null
  },
  include: {
    school: true,
    subject: true
  }
});
```

### Criar EnrollmentRequest

```typescript
const enrollmentRequest = await prisma.enrollmentRequest.create({
  data: {
    class: { connect: { id: classId } },
    professor: { connect: { id: professorId } },
    status: 'PENDING'
  }
});
```

### Aprovar inscricao

```typescript
await prisma.$transaction([
  prisma.enrollmentRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED' }
  }),
  prisma.classes.update({
    where: { id: classId },
    data: {
      enrolledById: professorId,
      available: false
    }
  })
]);
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