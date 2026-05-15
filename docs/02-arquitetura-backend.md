# Arquitetura do Backend

## Visao Geral da Arquitetura

O backend segue a arquitetura **Clean Architecture** com padrao **MVC** adaptado para NestJS:

```mermaid
graph TB
    subgraph Camada_de_Apresentacao
        C[Controllers]
    end
    
    subgraph Camada_de_Aplicacao
        S[Services]
        D[DTOs]
    end
    
    subgraph Camada_de_Dados
        R[Repositories]
        E[Entities]
    end
    
    subgraph Infraestrutura
        P[Prisma<br/>PostgreSQL]
        A[Auth JWT]
    end
    
    C --> S
    S --> D
    S --> R
    R --> E
    R --> P
    C --> A
```

## Estrutura de Modulos

```text
src/
├── modules/
│   ├── auth/           # Autenticacao e Login
│   ├── users/          # Gerenciamento de Usuarios
│   ├── schools/        # Gerenciamento de Escolas
│   ├── subjects/       # Gerenciamento de Disciplinas
│   ├── classes/        # Gerenciamento de Aulas/Turmas
│   ├── profile/        # Perfis de Usuario
│   └── swap-requests/  # Sistema de Troca de Aulas
├── config/             # Configuracoes
├── prisma.service.ts  # Conexao com Banco
└── app.module.ts      # Modulo Principal
```

## Padroes Utilizados

### Repository Pattern
Cada modulo possui seu proprio repository para acesso a dados:

```typescript
// Exemplo de estrutura
src/modules/swap-requests/
├── dto/                    # Data Transfer Objects
│   ├── create-swap-request.dto.ts
│   ├── update-swap-request.dto.ts
│   └── get-swap-request.dto.ts
├── entities/               # Entidades TypeScript
│   └── swap-request.entity.ts
├── swap-requests.repository.ts    # Acesso a dados
├── swap-requests.service.ts      # Logica de negocio
├── swap-requests.controller.ts   # Endpoints HTTP
└── swap-requests.module.ts       # Configuracao do modulo
```

### Dependency Injection
O NestJS utiliza injeção de dependência para gerenciar servicos:

```typescript
@Injectable()
export class SwapRequestsService {
  constructor(
    private readonly repository: SwapRequestsRepository,
    private readonly prisma: PrismaService,
  ) {}
}
```

## Fluxo de Requisicao HTTP

```mermaid
sequenceDiagram
    participant User as Cliente
    participant API as NestJS API
    participant Guard as Auth Guard
    participant Ctrl as Controller
    participant Svc as Service
    participant Repo as Repository
    participant DB as PostgreSQL

    User->>API: Request HTTP
    API->>Guard: Verificar Token JWT
    Guard->>API: Token valido
    API->>Ctrl: Dispatch to Controller
    Ctrl->>Svc: Chamar metodo
    Svc->>Repo: Acessar dados
    Repo->>DB: Query Prisma
    DB->>Repo: Resultado
    Repo->>Svc: Dados processados
    Svc->>Ctrl: Resposta
    Ctrl->>API: JSON Response
    API->>User: HTTP 200/201
```

## Autenticacao e Autorizacao

### Fluxo de Login

```mermaid
sequenceDiagram
    participant User as Usuario
    participant API as Backend
    participant DB as Banco

    User->>API: POST /auth/login<br/>{email, password}
    API->>DB: Buscar usuario por email
    DB->>API: Usuario encontrado
    API->>API: Comparar senha com bcrypt
    API->>API: Gerar JWT Token
    API->>User: { access_token }
```

### Estrutura do Token JWT

```json
{
  "sub": {
    "id": 1,
    "email": "professor@escola.com"
  },
  "iat": 1715731200,
  "exp": 1715817600
}
```

## Camadas de Seguranca

1. **Password**: Senhas hasheadas com bcrypt (cost factor 10)
2. **JWT**: Tokens com expiracao de 24h
3. **Guard**: Verificacao de token em rotas protegidas
4. **DTO Validation**: Validacao de dados com class-validator
5. **CORS**: Configurado para permitir apenas origens especificas

## Configuracoes de Ambiente

O sistema utiliza variaveis de ambiente (.env):

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
secret=sua_chave_secreta_aqui

# App
PORT=3000
```

---

## Padroes de Codigo

### Nomeclatura

- **Controllers**: *.controller.ts - nome no plural (swap-requests)
- **Services**: *.service.ts - nome singular (SwapRequestsService)
- **Repositories**: *.repository.ts - nome no plural
- **DTOs**: *.dto.ts - verbo + recurso (create-swap-request.dto.ts)

### Retorno de API

Todos os endpoints seguem o mesmo padrao de resposta:

```json
{
  "data": { ... },
  "message": "Sucesso",
  "statusCode": 200
}
```

### Códigos HTTP

| Codigo | Uso |
|--------|-----|
| 200 | Sucesso (GET, PATCH) |
| 201 | Criado com sucesso (POST) |
| 400 | Erro de validacao |
| 401 | Nao autenticado |
| 403 | Nao autorizado |
| 404 | Nao encontrado |
| 500 | Erro interno |
