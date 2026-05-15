# Feature Specification: Sistema de Troca de Aulas

**Feature Branch**: `feat/swap-request`

**Created**: 2026-05-14

**Status**: Draft

**Input**: Sistema para gerenciamento e facilitação de substituição de professores, evitando aulas vagas.

---

## Análise do Projeto: Estado Atual

### ✅ Implementado

```mermaid
graph TD
    subgraph Backend
        A[NestJS + TypeScript]
        B[Prisma ORM]
        C[PostgreSQL Docker]
        D[JWT Auth]
    end
    
    subgraph Módulos
        E[Users - CRUD]
        F[Schools - CRUD]
        G[Subjects - CRUD]
        H[Classes - CRUD]
        I[Profiles - CRUD]
        J[Auth - Login]
    end
    
    A --> B --> C
    D --> E
    E --> F
    E --> G
    E --> H
```

**Funcionalidades existentes**:
- Autenticação JWT com bcrypt
- Cadastro de usuários, escolas, disciplinas e turmas
- Controle de perfis (admin, professor, diretor)
- Permissão baseada em perfil (admin vê tudo, professor vê apenas sua escola)

### ❌ Faltando (Core do "Troca Aula")

1. **SwapRequest** - Módulo de solicitação de trocas
2. **Approval Workflow** - Fluxo de aprovação/reprovação
3. **Conflict Detection** - Detecção de conflitos de horário
4. **Schedule Management** - Gerenciamento de horários/aulas

---

## Fluxo de Negócio Proposto

```mermaid
sequenceDiagram
    participant Professor as Professor
    participant Sistema as Backend
    participant DB as Database
    
    Professor->>Sistema: POST /swap-requests
    Sistema->>DB: Criar SwapRequest (status: PENDING)
    Sistema->>DB: Verificar conflitos de horário
    alt Há conflito
        Sistema->>Professor: 400 - Conflito de horário
    else Sem conflito
        Sistema->>Professor: 201 - Solicitação criada
        Sistema->>Professor: Notificar professor替代
        Professor->>Sistema: PATCH /swap-requests/:id/accept
        alt Aceito
            Sistema->>DB: Atualizar status para APPROVED
            Sistema->>DB: Registrar substituição
        else Recusado
            Sistema->>DB: Atualizar status para REJECTED
        end
    end
```

---

## User Scenarios & Testing

### User Story 1 - Solicitação de Troca (Priority: P1)

Como professor, quero solicitar a troca de uma de minhas aulas com outro professor, para que minha aula não fique vazia na minha ausência.

**Por que esta prioridade**: Funcionalidade core do sistema - sem ela, não existe "Troca Aula"

**Teste Independente**: Criar solicitação de troca entre dois professores e verificar que aparece na listagem

**Cenários de Aceitação**:
1. **Given** professor logado com aula agendada, **When** cria solicitação de troca, **Then** solicitação criada com status PENDING
2. **Given** solicitação de troca, **When** professor替代 aceita, **Then** status muda para APPROVED e substituição é registrada

---

### User Story 2 - Aprovação de Troca (Priority: P1)

Como professor substituto, quero aceitar ou recusar uma solicitação de troca, para controlar minha disponibilidade.

**Por que esta prioridade**: Sem aprovação, a troca não se concretiza

**Teste Independente**: Aceitar uma solicitação pendente e verificar atualização de status

**Cenários de Aceitação**:
1. **Given** solicitação pendente, **When** professor substituto aceita, **Then** status = APPROVED
2. **Given** solicitação pendente, **When** professor substituto recusa, **Then** status = REJECTED

---

### User Story 3 - Listar Solicitações (Priority: P2)

Como professor, quero visualizar todas as minhas solicitações de troca (criadas e recebidas), para gerenciar minhas trocas.

**Por que esta prioridade**: Necessário para acompanhamento e gestão

**Teste Independente**: Listar solicitações e filtrar por status

**Cenários de Aceitação**:
1. **Given** professor logado, **When** acessa listagem, **Then** vê todas as suas solicitações
2. **Given** solicitações com diferentes status, **When** filtra por status, **Then** mostra apenas as correspondentes

---

### User Story 4 - Cancelamento de Solicitação (Priority: P3)

Como professor, quero cancelar uma solicitação de troca que fiz, antes que seja aceita.

**Por que esta prioridade**: Flexibilidade para o solicitante

**Cenários de Aceitação**:
1. **Given** solicitação PENDING, **When** professor cancela, **Then** status = CANCELLED
2. **Given** solicitação APPROVED, **When** professor tenta cancelar, **Then** erro - já aceita

---

## Requirements

### Functional Requirements

- **FR-001**: Sistema DEVE permitir solicitação de troca de aula (criado por diretor/admin)
- **FR-002**: Sistema DEVE verificar conflitos de horário (mesmo dia + horário sobreposto)
- **FR-003**: Professor substituto DEVE poder aceitar/rejeitar apenas aulas da sua matéria
- **FR-004**: Sistema DEVE listar solicitações filtrando por status
- **FR-005**: Sistema DEVE permitir cancelamento de solicitações pendentes
- **FR-006**: Apenas diretor ou auxiliar administrativo da escola pode criar SwapRequest
- **FR-007**: Apenas professor da mesma matéria pode aceitar swap
- **FR-008**: Professor DEVE poder-se inscribir/desinscrever de aulas

### Non-Functional Requirements

- **NFR-001**: Respostas de API em formato JSON padronizado
- **NFR-002**: Autenticação JWT obrigatória para todas as rotas
- **NFR-003**: Validação de dados com class-validator

---

## Key Entities

- **SwapRequest**: Solicitação de troca (id, classId, requesterId, targetId, status, createdAt, updatedAt)
- **Class**: Aula existente (já existe no schema.prisma)
- **User**: Professores (já existe)

**Relacionamentos**:
```
SwapRequest 1 --> 1 Class (aula sendo trocada)
SwapRequest 1 --> 1 User (solicitante)
SwapRequest 1 --> 1 User (professor替代)
```

---

## Success Criteria

- **SC-001**: Conflitos de horário são detectados antes da criação (mesmo dia + sobreposição)
- **SC-002**: Fluxo completo de troca (criar → aceitar → aprovado) funciona sem erros
- **SC-003**: Apenas professores da matéria podem aceitar swap

---

## Assumptions

- Professores e diretores já existem no sistema (Users com profile de professor/diretor)
- Aulas (Classes) atualmente não têm campos de horário - precisa adicionar dayOfWeek, startTime, endTime
- Sistema será usado por uma única escola inicialmente (simplicidade)
- Notificações serão simplificadas (sem push/email real - apenas registro em banco)
- Perfil de usuário determina permissões: diretor/admin podem criar swap, professor pode aceitar apenas da matéria

---

## Clarifications

### Session 2026-05-14

- Q: Dados de horário das Classes já existem ou precisam ser adicionados? → A: Adicionar campos de horário no modelo Class via Prisma (dayOfWeek, startTime, endTime)
- Q: O que define "conflito de horário"? → A: Mesmo dia + horário sobreposto (dayOfWeek = dayOfWeek AND horário se sobrepõe)
- Q: SC-001 (menos de 30 segundos) deve ser mantido como requisito formal? → A: Remover SC-001 (não é crítico para MVP)
- Q: Como identificar o professor替代 na requisição? → A: targetId (user ID) no corpo da requisição POST
- Q: Quem pode criar SwapRequest e quem pode aceitar? → A: Apenas diretor/auxiliar administrativo cria swap; Professor só aceita swap da matéria dele; Professor pode se increver/desinscrever de aulas