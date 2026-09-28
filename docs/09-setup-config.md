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
    B --> C[Drizzle Generate]
    C --> D[Drizzle Migrate]
    D --> E[Drizzle Studio]
```

```bash
# Instala todas as dependências do projeto
pnpm install

# Gera as migrations a partir do schema (src/database/schema.ts)
pnpm db:generate

# Aplica as migrations pendentes (drizzle/migrations)
pnpm db:migrate

# (Opcional) Abre uma interface visual do banco
pnpm db:studio
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de dados — a app conecta como papel NOSUPERUSER (o RLS é ignorado
# por superusuário; ver "RLS" no README e scripts/setup-rls-role.sql)
DATABASE_URL="postgresql://troca_aula_app:senha@localhost:5432/troca_aula?schema=public"

# Papel dono/superusuário, usado SÓ por `pnpm db:migrate` (DDL).
# Sem esta variável, o migrate cai de volta para DATABASE_URL.
MIGRATION_DATABASE_URL="postgresql://usuario:senha@localhost:5432/troca_aula?schema=public"

# Autenticação JWT
# Nome real lido pelo código (src/config/configuration.ts): SECRET, não JWT_SECRET.
# Se omitido, cai no fallback inseguro hardcoded do código — sempre defina em qualquer ambiente.
SECRET="sua_chave_secreta_aqui_mude_em_producao"
SALT=10

# Servidor
PORT=3000
NODE_ENV=development

# Notificações por e-mail (opcional) — sem SMTP_HOST o EmailService vira no-op
# SMTP_HOST=smtp.exemplo.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=usuario
# SMTP_PASS=senha
# SMTP_FROM="Troca Aula <no-reply@exemplo.com>"
```

Antes da primeira subida, crie o papel de aplicação (idempotente):

```bash
docker exec -i postgres_container psql -U <admin> -d troca_aula \
  -v app_password='senha' -f - < scripts/setup-rls-role.sql
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
# (aplica o mínimo global de 90% em statements/branches/functions/lines
#  configurado no package.json; entrypoints/declarativo — main.ts,
#  database/migrate.ts e database/schema.ts — ficam fora da conta)
pnpm run test:cov

# Executar testes e2e
pnpm run test:e2e
```

### Exemplo de Teste Unitário

```typescript
// Exemplo de teste de serviço (spec real em
// src/modules/enrollment-requests/enrollment-requests.service.spec.ts)
describe('EnrollmentRequestsService', () => {
  let service: EnrollmentRequestsService;
  let repository: EnrollmentRequestsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentRequestsService,
        { provide: EnrollmentRequestsRepository, useValue: mockRepository },
        { provide: UsersRepository, useValue: mockUserRepository },
        { provide: ClassesRepository, useValue: mockClassesRepository },
        { provide: DrizzleService, useValue: { db: mockDb } },
        TenantContextService,
      ],
    }).compile();

    service = module.get<EnrollmentRequestsService>(EnrollmentRequestsService);
    repository = module.get<EnrollmentRequestsRepository>(
      EnrollmentRequestsRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an enrollment request', async () => {
    // Cenário: aula vaga da mesma matéria, sem conflito e dentro do limite.
    // O spec real mocka ClassesRepository.findOne, UsersRepository.findOne e
    // o DrizzleService (conflito/limite) antes de chamar service.create(1, 2).
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
SECRET="chave_muito_segura_aleatoria"
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
```

O sistema expõe o endpoint:
- `/health` - Verifica se a aplicação está rodando

---

## Estrutura de Pastas do Projeto

```text
troca-aula-backend/
├── src/
│   ├── config/           # Configurações
│   ├── database/         # Schema Drizzle, conexão, soft delete e runner de migrations
│   │   ├── schema.ts           # Schema do banco (fonte de verdade)
│   │   ├── drizzle.service.ts  # Conexão (Drizzle + postgres.js)
│   │   ├── migrate.ts          # Script do `pnpm db:migrate`
│   │   └── soft-delete.ts
│   ├── modules/          # Módulos da aplicação
│   │   ├── auth/         # Autenticação, guards e contexto de tenant
│   │   ├── users/        # Gerenciamento de usuários
│   │   ├── schools/      # Gerenciamento de escolas
│   │   ├── subjects/     # Gerenciamento de disciplinas
│   │   ├── classes/      # Gerenciamento de aulas
│   │   ├── enrollment-requests/      # Candidaturas a aulas vagas
│   │   ├── networks/                 # Redes de ensino
│   │   ├── workload-policies/        # Políticas de carga horária
│   │   ├── teacher-workload-records/ # Jornada docente
│   │   ├── monthly-closing-reports/  # Fechamento mensal
│   │   └── audit-log/                # Auditoria
│   ├── app.module.ts     # Módulo principal
│   └── main.ts           # Entry point
├── drizzle/
│   └── migrations/       # Migrações geradas pelo drizzle-kit
├── prisma/               # Referência histórica do Prisma (não é mais a fonte de verdade)
├── test/                 # Testes e2e
├── docs/                 # Documentação
├── docker-compose.yml    # Docker Compose
├── Dockerfile            # Dockerfile
├── drizzle.config.ts     # Configuração do drizzle-kit
├── package.json          # Dependências
└── tsconfig.json         # Configuração TypeScript
```

---

## Troubleshooting

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| Erro ao conectar no banco | Verificar se o PostgreSQL está rodando e a URL está correta |
| Erro de autenticação JWT | Verificar se a variável SECRET está configurada |
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

# Aplicar as migrations pendentes do Drizzle
pnpm db:migrate

# Resetar banco de dados
# Não há script de reset no package.json: recrie o banco no PostgreSQL e
# rode `pnpm db:migrate` para reaplicar as migrations de drizzle/migrations.
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
| `src/database/drizzle.service.ts` | Serviço de conexão com banco de dados (Drizzle + postgres.js) |
| `src/database/schema.ts` | Schema do banco (tabelas, colunas, índices e relations) |
| `src/database/migrate.ts` | Script que aplica as migrations (`pnpm db:migrate`) |
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
        M8[networks]
        M9[workload-policies]
        M10[teacher-workload-records]
        M11[monthly-closing-reports]
        M12[audit-log]
    end
    
    subgraph "Infraestrutura"
        I1[Drizzle + postgres.js]
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
    M8 --> I1
    M9 --> I1
    M10 --> I1
    M11 --> I1
    M12 --> I1
    
    I1 --> I2
    I2 --> I3
    
    style M1 fill:#2196F3,color:#fff
    style M2 fill:#4CAF50,color:#fff
    style M3 fill:#FF9800,color:#fff
    style M4 fill:#9C27B0,color:#fff
    style M5 fill:#E91E63,color:#fff
    style M6 fill:#00BCD4,color:#fff
    style M7 fill:#795548,color:#fff
    style M8 fill:#3F51B5,color:#fff
    style M9 fill:#009688,color:#fff
    style M10 fill:#FF5722,color:#fff
    style M11 fill:#607D8B,color:#fff
    style M12 fill:#8BC34A,color:#fff
```

---

## Glossário Técnico Completo

### Termos de Backend

| Termo | Definição |
|-------|-----------|
| NestJS | Framework progressivo para construir aplicações Node.js |
| TypeScript | Linguagem que adiciona tipagem estática ao JavaScript |
| Drizzle ORM | ORM TypeScript que facilita a comunicação com o banco de dados (migrations via drizzle-kit) |
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
```
