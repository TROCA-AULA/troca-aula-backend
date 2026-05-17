# Feature Specification: Substitution Limit + Gov.br Integration

**Feature Branch**: `003-substitution-limit-govbr`

**Created**: 2026-05-16

**Status**: Draft

**Input**: User description: "analise as #docs/ entenda o projeto, impemente as pendencias Implementar P1: Adicionar controle de limite de substituições. Implementar P2: Integrar com Conta Gov.br <- nessa parte do gov por hora pode rejeitar mando um erro de nao autorizado ou nao encontrado porem com aseguinte mensage recurso em desenvolvimento. Atualizar documentação: Manter docs/10-contratos-api.md atualizado conforme mudanças"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Controle de Limite de Substituições (Priority: P1)

Professor deve ter limite de substituições por semestre controlado automaticamente pelo sistema.

**Why this priority**: Sem esta funcionalidade, não há controle sobre sobrecarga de trabalho dos professores, descumprindo regra de negócio documentada.

**Independent Test**: O diretor pode configurar o limite na escola e o sistema bloqueia automaticamente candidaturas quando o professor atinge o limite.

**Acceptance Scenarios**:

1. **Given** Escola com limite de 10 substituições/semestre, **When** Professor tenta se candidatar à 11ª aula, **Then** Sistema bloqueia com mensagem "Limite de substituições atingido para este semestre"
2. **Given** Escola com limite de 10 substituições/semestre, **When** Professor tenta se candidatar à 5ª aula (abaixo do limite), **Then** Sistema permite a candidatura normalmente
3. **Given** Escola sem limite configurado, **When** Professor tenta se candidatar, **Then** Sistema permite normalmente (sem restrição de limite)

---

### User Story 2 - Integração com Conta Gov.br (Priority: P2)

Sistema deve utilizar Conta Gov.br para autenticação, retornando erro temporário durante integração.

**Why this priority**: A autenticação atual não está alinhada com o especificado no documento base. O Gov.br oferece maior segurança e conformidade com padrões governamentais.

**Independent Test**: Ao tentar autenticar via Gov.br, sistema retorna mensagem indicando recurso em desenvolvimento.

**Acceptance Scenarios**:

1. **Given** Usuário tenta autenticar via Gov.br, **When** Envia token Gov.br para validação, **Then** Sistema retorna erro 401 com mensagem "Recurso em desenvolvimento"
2. **Given** Usuário tenta autenticar via Gov.br, **When** Envia token inválido, **Then** Sistema retorna erro 404 com mensagem "Recurso em desenvolvimento"

---

### User Story 3 - Atualização de Documentação (Priority: P3)

Documentação de contratos de API deve refletir as mudanças implementadas.

**Why this priority**: Mantém consistência entre implementação e documentação para integrações futuras.

**Independent Test**: Documentação em docs/10-contratos-api.md inclui novos endpoints e respostas.

**Acceptance Scenarios**:

1. **Given** Nova funcionalidade implementada, **When** Documentação atualizada, **Then** Frontend pode consumir os novos contratos corretamente

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE adicionar campo `substitutionLimitPerSemester` na entidade Schools para configurar limite de substituições por escola
- **FR-002**: Sistema DEVE verificar se professor atingiu o limite antes de permitir nova candidatura
- **FR-003**: Sistema DEVE bloquear automaticamente candidaturas quando limite atingido
- **FR-004**: Sistema DEVE permitir que limite zero (0) signifique sem limite de substituições
- **FR-005**: Sistema DEVE adicionar endpoint POST /auth/login-govbr para autenticação via Gov.br
- **FR-006**: Sistema DEVE retornar erro 401 ou 404 com mensagem "Recurso em desenvolvimento" para endpoint Gov.br
- **FR-007**: Sistema DEVE atualizar documentação em docs/10-contratos-api.md com novos contratos

### Key Entities

- **Schools**: Adicionar atributo `substitutionLimitPerSemester` (número inteiro, opcional)
- **EnrollmentRequest**: Manter relação existente com professor para contagem de substituições aprovadas

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sistema permite candidaturas quando professor está abaixo do limite configurado
- **SC-002**: Sistema bloqueia candidaturas quando professor atinge limite configurado
- **SC-003**: Endpoint Gov.br retorna mensagem clara de recurso em desenvolvimento
- **SC-004**: Documentação atualizada com novos contratos de API

## Assumptions

- Limite é considerado por semestre letivo atual
- Contagem considera apenas substituições APROVADAS (não pendentes ou rejeitadas)
- Integração Gov.br será implementada formalmente em fase posterior
- Configuração de limite pode ser atualizada pelo diretor da escola