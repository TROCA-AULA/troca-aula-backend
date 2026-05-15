# Setup e Configuração do Projeto

Este documento fornece instruções detalhadas para configurar o ambiente de desenvolvimento, executar testes e fazer deploy do Sistema Troca Aula.

---

## Requisitos Prévios

### Software Necessário

```mermaid
graph TB
    subgraph "Ferramentas Necessarias"
        F1[Node.js 18+]
        F2[pnpm 8+]
        F3[Docker Desktop]
        F4[PostgreSQL 14+]
        F5[Git]
    end
    
    subgraph "Opcional"
        F6[VS Code]
        F7[Insomnia/Postman]
        F8[DBeaver]
    end
    
    F1 --> F2
    F2 --> F3
    F3 --> F4
    F4 --> F5
```

### Verificação de Instalação

Execute os seguintes comandos para verificar se tudo está instalado corretamente:

```bash
# Verificar Node.js
node --version
# Esperado: v18.x.x ou superior

# Verificar pnpm
pnpm --version
# Esperado: 8.x.x ou superior

# Verificar Docker
docker --version
# Esperado: Docker version 20.x.x ou superior

# Verificar PostgreSQL
psql --version
# Esperado: psql (PostgreSQL) 14.x ou superior
```

---

## Instalação do Projeto

### 1. Clonar o Repositório

```bash
git clone https://github.com/TROCA-AULA/troca-aula-backend.git
cd troca-aula-backend
```

### 2. Instalar Dependências

```mermaid
flowchart LR
    A[pnpm install] --> B[node_modules]
    B --> C[Prisma Generate]
    C --> D[Prisma Migrate]
    D --> E[Prisma Studio]
```

```bash
# Instala todas as dependências do projeto
pnpm install

# Gera o cliente Prisma
npx prisma generate

# Executa as migrações do banco de dados
npx prisma migrate dev

# (Opcional) Abre uma interface visual do banco
npx prisma studio
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/troca_aula?schema=public"

# Autenticação JWT
JWT_SECRET="sua_chave_secreta_aqui_mude_em_producao"
JWT_EXPIRATION="24h"

# Servidor
PORT=3000
NODE_ENV=development
```

### 4. Executar o Servidor

```bash
# Modo desenvolvimento (com hot-reload)
pnpm run start:dev

# Modo produção
pnpm run start:prod

# Modo debug
pnpm run start:debug
```

O servidor estará disponível em: `http://localhost:3000`

---

## Executando Testes

### Estrutura de Testes

```mermaid
graph TB
    subgraph "Testes Unitarios"
        T1[Service Tests]
        T2[Repository Tests]
    end
    
    subgraph "Testes de Integração"
        T3[Controller Tests]
        T4[E2E Tests]
    end
    
    subgraph "Cobertura"
        T5[Jest Coverage]
    end
    
    T1 --> T3
    T2 --> T3
    T3 --> T4
    T3 --> T5
```

### Comandos de Teste

```bash
# Executar todos os testes
pnpm run test

# Executar testes em modo watch (para desenvolvimento)
pnpm run test:watch

# Executar testes com cobertura de código
pnpm run test:cov

# Executar testes e2e
pnpm run test:e2e
```

### Exemplo de Teste Unitário

```typescript
// Exemplo de teste de serviço
describe('SwapRequestsService', () => {
  let service: SwapRequestsService;
  let repository: jest.Mocked<SwapRequestsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SwapRequestsService,
        {
          provide: SwapRequestsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SwapRequestsService>(SwapRequestsService);
    repository = module.get(SwapRequestsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a swap request', async () => {
    const createDto = { classId: 1, targetId: 2 };
    repository.create.mockResolvedValue({ id: 1, ...createDto });

    const result = await service.create(createDto);
    expect(result).toHaveProperty('id');
  });
});
```

---

## Pipeline CI/CD

### Visão Geral do Pipeline

```mermaid
flowchart TB
    subgraph "GitHub Actions"
        A[Push/Merge] --> B[Checkout]
        B --> C[Setup Node]
        C --> D[Install Deps]
        D --> E[Run Lint]
        E --> F[Run Tests]
        F --> G[Build]
        G --> H{Success?}
        H -->|Yes| I[Deploy Staging]
        H -->|No| J[Notify Failure]
        I --> K[Deploy Production]
    end
    
    style A fill:#333,color:#fff
    style H fill:#4CAF50,color:#fff
    style J fill:#f44336,color:#fff
    style K fill:#FF9800,color:#fff
```

### Stages do Pipeline

| Stage | Ferramenta | Descrição |
|-------|------------|-----------|
| Lint | ESLint | Verifica padrões de código |
| Test | Jest | Executa testes unitários |
| Build | NestJS | Compila o código |
| Deploy | GitHub Actions | Faz deploy automático |

---

## Docker e Containerização

###构建 Imagem Docker

```bash
# Build da imagem
docker build -t troca-aula-backend:latest .

# Executar container
docker run -p 3000:3000 --env-file .env troca-aula-backend:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/troca_aula
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=troca_aula
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Configuração em Ambiente de Produção

### Variáveis de Produção

```env
# .env.production
DATABASE_URL="postgresql://user:pass@host:5432/troca_aula_prod"
JWT_SECRET="chave_muito_segura_aleatoria"
JWT_EXPIRATION="24h"
NODE_ENV=production
PORT=3000
```

### Health Check

```mermaid
sequenceDiagram
    participant K8s as Kubernetes
    participant App as API NestJS
    
    K8s->>App: GET /health
    App-->>K8s: { "status": "ok", "uptime": 1234 }
    K8s->>App: GET /ready
    App-->>K8s: { "status": "ready" }
```

O sistema expõe os endpoints:
- `/health` - Verifica se a aplicação está rodando
- `/ready` - Verifica se a aplicação está pronta para receber tráfego

---

## Estrutura de Pastas do Projeto

```text
troca-aula-backend/
├── src/
│   ├── config/           # Configurações
│   ├── modules/          # Módulos da aplicação
│   │   ├── auth/         # Autenticação
│   │   ├── users/        # Gerenciamento de usuários
│   │   ├── schools/      # Gerenciamento de escolas
│   │   ├── subjects/     # Gerenciamento de disciplinas
│   │   ├── classes/      # Gerenciamento de aulas
│   │   ├── profile/      # Perfis de usuário
│   │   └── enrollment-requests/ # Candidaturas
│   ├── prisma.service.ts # Conexão com banco
│   ├── app.module.ts    # Módulo principal
│   └── main.ts          # Entry point
├── prisma/
│   ├── schema.prisma    # Schema do banco
│   └── migrations/      # Migrações
├── test/                # Testes e2e
├── docs/                # Documentação
├── docker-compose.yml   # Docker Compose
├── Dockerfile           # Dockerfile
├── package.json        # Dependências
└── tsconfig.json       # Configuração TypeScript
```

---

## Troubleshooting

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| Erro ao conectar no banco | Verificar se o PostgreSQL está rodando e a URL está correta |
| Erro de autenticação JWT | Verificar se a variável JWT_SECRET está configurada |
| Testes falhando | Verificar se o banco de dados de teste está configurado |
| Porta em uso | Mudar a porta no arquivo .env ou matar o processo |

### Comandos Úteis

```bash
# Ver logs do container Docker
docker logs -f container_id

# Verificar processos usando a porta
lsof -i :3000

# Limpar node_modules e reinstalar
rm -rf node_modules && pnpm install

# Resetar banco de dados
npx prisma migrate reset
```

---

## Boas Práticas de Desenvolvimento

### Commits

```mermaid
flowchart LR
    subgraph "Conventional Commits"
        C1["feat: Nova funcionalidade"]
        C2["fix: Correção de bug"]
        C3["docs: Documentação"]
        C4["refactor: Refatoração"]
        C5["test: Testes"]
    end
    
    style C1 fill:#4CAF50,color:#fff
    style C2 fill:#f44336,color:#fff
    style C3 fill:#2196F3,color:#fff
    style C4 fill:#FF9800,color:#fff
    style C5 fill:#9C27B0,color:#fff
```

Execute commits interativos:

```bash
pnpm run commit
```

### Code Review Checklist

- [ ] Código segue o style guide do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada (se necessário)
- [ ] Não há secrets commitados
- [ ] Código está limpo e legível

---

## Referências de Código

### Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `src/main.ts` | Ponto de entrada da aplicação |
| `src/app.module.ts` | Módulo principal que organiza todos os sub-módulos |
| `src/prisma.service.ts` | Serviço de conexão com banco de dados |
| `src/config/configuration.ts` | Configurações globais |
| `src/modules/auth/auth.service.ts` | Lógica de autenticação JWT |
| `src/modules/enrollment-requests/enrollment-requests.service.ts` | Service de candidaturas |
| `src/modules/classes/classes.service.ts` | Service de gerenciamento de aulas |

### Estrutura de Módulos

```mermaid
graph TB
    subgraph "Módulos do Sistema"
        M1[auth]
        M2[users]
        M3[schools]
        M4[subjects]
        M5[classes]
        M6[profile]
        M7[enrollment-requests]
    end
    
    subgraph "Infraestrutura"
        I1[Prisma]
        I2[Config]
        I3[Main]
    end
    
    M1 --> I1
    M2 --> I1
    M3 --> I1
    M4 --> I1
    M5 --> I1
    M6 --> I1
    M7 --> I1
    
    I1 --> I2
    I2 --> I3
    
    style M1 fill:#2196F3,color:#fff
    style M2 fill:#4CAF50,color:#fff
    style M3 fill:#FF9800,color:#fff
    style M4 fill:#9C27B0,color:#fff
    style M5 fill:#E91E63,color:#fff
    style M6 fill:#00BCD4,color:#fff
    style M7 fill:#795548,color:#fff
```

---

## Glossário Técnico Completo

### Termos de Backend

| Termo | Definição |
|-------|-----------|
| NestJS | Framework progressivo para construir aplicações Node.js |
| TypeScript | Linguagem que adiciona tipagem estática ao JavaScript |
| Prisma | ORM que facilita a comunicação com banco de dados |
| PostgreSQL | Sistema de banco de dados relacional open source |
| JWT | JSON Web Token - padrão para autenticação stateless |
| bcrypt | Biblioteca para hashing de senhas |
| REST | Arquitetura de API que usa métodos HTTP |

### Termos de Infraestrutura

| Termo | Definição |
|-------|-----------|
| Docker | Plataforma para containerização de aplicações |
| CI/CD | Integração Contínua / Entrega Contínua |
| GitHub Actions | Plataforma de automação de CI/CD |
| Cloud | Computação em nuvem (ex: Render, Railway) |
| Health Check | Endpoint que verifica se a aplicação está funcionando |

### Termos de Negócio

| Termo | Definição |
|-------|-----------|
| Aula Vaga | Aula sem professor titular temporariamente |
| Candidatura | Solicitação de professor para preencher uma aula vaga |
| Teto de Substituições | Limite máximo de aulas que um professor pode substituir |
| Habilitação | Qualificação de professor para uma disciplina |
| Perfil | Tipo de usuário que define permissões no sistema |

---

## Mapa de Navegação da Documentação

```mermaid
mindmap
  root((Documentacao))
    Administracao
      README
      Setup e Config
    Produto
      Visao Geral
      Documentacao Produto
    Tecnico
      Arquitetura Backend
      Endpoints
    Negocio
      Regras de Negocio
      Fluxos de Negocio
      User Stories
    Dados
      Modelo de Dados
      Fluxo do Banco
    Annexos
      base.MD
