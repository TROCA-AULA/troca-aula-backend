# Prompt para Desenvolvimento Frontend

## Visão Geral do Projeto

**Nome**: Sistema Troca Aula  
**Purpose**: Gerenciamento de Substituição de Professores em instituições de ensino  
**Tipo**: API RESTful + Frontend (React)

---

## Contexto Técnico

### Stack do Backend
- **Framework**: NestJS 11
- **Linguagem**: TypeScript 5.7.3
- **ORM**: Prisma 6.7
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT + bcrypt
- **Package Manager**: pnpm
- **Node Version**: 22.22.0 (via .nvmrc)

### Estrutura de Módulos
```
src/modules/
├── auth/           # Autenticação (login, JWT)
├── users/          # Usuários (professores)
├── schools/        # Escolas
├── subjects/       # Disciplinas
├── classes/        # Aulas (aulas vagas)
├── enrollment-requests/  # Candidaturas/substituições
└── profile/        # Perfis de usuário
```

---

## Contratos de API Disponíveis

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login com email/senha → retorna JWT |
| POST | `/auth/login-govbr` | Login Gov.br (em desenvolvimento - retorna 401) |

### Users (Usuários/Professores)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/users` | Lista todos os usuários |
| GET | `/users/:id` | Busca usuário por ID |
| POST | `/users` | Cria novo usuário |
| PATCH | `/users/:id` | Atualiza usuário |
| DELETE | `/users/:id` | Remove usuário (soft delete) |

### Schools (Escolas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/schools` | Lista todas as escolas |
| GET | `/schools/:id` | Busca escola por ID |
| POST | `/schools` | Cria nova escola |
| PATCH | `/schools/:id` | Atualiza escola |
| DELETE | `/schools/:id` | Remove escola |

**Campo importante**: `substitutionLimitPerSemester` - limite de substituições por semestre

### Subjects (Disciplinas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/subjects` | Lista todas as disciplinas |
| GET | `/subjects/:id` | Busca disciplina por ID |
| POST | `/subjects` | Cria nova disciplina |
| PATCH | `/subjects/:id` | Atualiza disciplina |
| DELETE | `/subjects/:id` | Remove disciplina |

### Classes (Aulas/Aulas Vagas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/classes` | Lista aulas (aceita filtros: available, dayOfWeek, etc) |
| GET | `/classes/:id` | Busca aula por ID |
| POST | `/classes` | Cria nova aula vaga |
| PATCH | `/classes/:id` | Atualiza aula |
| DELETE | `/classes/:id` | Remove aula |

**Filtros disponíveis**:
- `?available=true` - apenas aulas vagas
- `?dayOfWeek=1` - dia da semana (1-7)
- `?subjectId=1` - disciplina específica

### Enrollment Requests (Candidaturas/Substituições)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/enrollment-requests` | Lista candidaturas |
| GET | `/enrollment-requests/:id` | Busca candidatura por ID |
| POST | `/enrollment-requests` | Cria candidatura (professor se candidata) |
| PATCH | `/enrollment-requests/:id/approve` | Aprova candidatura (diretor) |
| PATCH | `/enrollment-requests/:id/reject` | Rejeita candidatura (diretor) |
| PATCH | `/enrollment-requests/:id/cancel` | Cancela candidatura (professor) |

**Status de Candidatura**: `PENDING` | `APPROVED` | `REJECTED`

### Profiles (Perfis)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/profiles` | Lista todos os perfis |
| GET | `/profiles/:id` | Busca perfil por ID |
| POST | `/profiles` | Cria novo perfil |
| PATCH | `/profiles/:id` | Atualiza perfil |
| DELETE | `/profiles/:id` | Remove perfil |

---

## Regras de Negócio do Backend

### 1. Controle de Limite de Substituições
- Cada escola pode ter um `substitutionLimitPerSemester` configurado
- Se definido, o sistema bloqueia novas candidaturas quando o professor atinge o limite
- Mensagem de erro: "Limite de substituições atingido para este semestre (X limite)"

### 2. Verificação de Conflito de Horário
- Sistema impede candidatura se professor já tem aula no mesmo horário
- Mensagem de erro: "Conflito de horário detectado"

### 3. Status de Candidatura
- `PENDING` - aguardando aprovação do diretor
- `APPROVED` - substituicao confirmada
- `REJECTED` - rejeitada pelo diretor

### 4. Perfis de Usuário
- **Admin**: acesso total
- **Diretor**: pode aprobar/rejeitar candidaturas, gerenciar escolas
- **Professor**: pode se candidatar a aulas vagas, criar aulas vagas
- **Agente Admin**: pode criar/editar aulas vagas

---

## Headers Necessários

Todas as requisições autenticadas precisam do header:
```http
Authorization: Bearer <jwt_token>
```

---

## Response Format (Padrão)

Sucesso (200/201):
```json
{
  "data": { ... },
  "message": "Mensagem de sucesso",
  "statusCode": 200
}
```

Erro (400/401/404/500):
```json
{
  "statusCode": 400,
  "message": "Mensagem de erro",
  "error": "Bad Request"
}
```

---

## Sua Tarefa

1. **Analise os contratos de API acima** e compare com o frontend atual
2. **Identifique pendências** - endpoints que o frontend deveria consumir mas não está
3. **Liste o que falta** - funcionalidades, campos, telas, etc.
4. **Crie um arquivo de pendências** em `docs/11-pendencias.md` (ou atualize)

### Estrutura do Arquivo de Pendências

```markdown
# Pendências do Frontend

## Funcionalidades Faltando

### 1. [Nome da funcionalidade]
- **Endpoint**: POST /classes
- **Status**: Não implementado / Parcial
- **Descrição**: O frontend não consegue criar aulas vagas
- **Prioridade**: Alta/Média/Baixa

## Campos Faltando

### 1. [Nome do campo]
- **Tela**: [onde deve aparecer]
- **Descrição**: Campo não está sendo enviado/recebido

## Correções Necessárias

### 1. [Issue]
- **Descrição**: [o que precisa arrumar]
```

---

## Fonte de Informação

- Contratos completos: `docs/10-contratos-api.md`
- Visão geral do projeto: `docs/01-visao-geral.md`
- Regras de negócio: `docs/04-regras-negocio.md`
- Modelo de dados: `docs/06-modelo-dados.md`