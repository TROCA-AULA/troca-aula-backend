# User Stories

## Visao Geral

Este documento apresenta as historias de usuario do sistema Troca Aula, organizadas por prioridade e feature.

---

## User Story 1: Solicitar Troca de Aula

**Prioridade**: P1 - MVP

**Como** usuario com perfil de Diretor,
**Eu quero** criar uma solicitacao de troca de aula,
**Para que** outro professor possa substituir minha aula quando eu estiver ausente.

### Cenarios de Aceitacao

**Cenario 1: Criacao bem-sucedida**
```
Dado que estou logado como Diretor
E existe uma aula cadastrada no sistema
Quando acesso o endpoint POST /swap-requests com classId e targetId
Entao a solicitacao e criada com status PENDING
E recebo confirmacao de sucesso
```

**Cenario 2: Conflito de horario**
```
Dado que estou logado como Diretor
E tento criar uma solicitacao para professor替代
Quando o professor替代 ja tem aula no mesmo dia e horario
Entao recebo erro "Conflito de horario detectado"
E a solicitacao nao e criada
```

**Cenario 3: Acesso negado**
```
Dado que estou logado como Professor
Quando tento criar uma solicitacao de troca
Entao recebo erro "Apenas diretor ou admin pode criar"
```

---

## User Story 2: Aceitar/Rejeitar Troca

**Prioridade**: P1 - MVP

**Como** professor substituto,
**Eu quero** aceitar ou rejeitar uma solicitacao de troca,
**Para** controlar minha disponibilidade e assumir a aula caso aceita.

### Cenarios de Aceitacao

**Cenario 1: Aceitar com sucesso**
```
Dado que existe uma solicitacao PENDING
E estou logado como o professor替代 (target)
E leciono a mesma materia da aula
Quando aceito a solicitacao
Entao o status muda para APPROVED
E recebo confirmacao de sucesso
```

**Cenario 2: Aceitar wrong materia**
```
Dado que existe uma solicitacao PENDING
E estou logado como o professor替代
Quando tento aceitar mas nao leciono a mesma materia
Entao recebo erro "Voce so pode aceitar aulas da sua materia"
```

**Cenario 3: Rejeitar solicitacao**
```
Dado que existe uma solicitacao PENDING
E estou logado como o professor替代
Quando rejeito a solicitacao
Entao o status muda para REJECTED
```

---

## User Story 3: Listar Solicitacoes

**Prioridade**: P2

**Como** professor,
**Eu quero** visualizar todas as minhas solicitacoes de troca,
**Para** gerenciar e acompanhar o status das minhas solicitacoes.

### Cenarios de Aceitacao

**Cenario 1: Listar todas**
```
Dado que estou autenticado
Quando acesso GET /swap-requests sem filtros
Entao vejo todas as solicitacoes que criei ou recebi
```

**Cenario 2: Filtrar por status**
```
Dado que estou autenticado
Quando acesso GET /swap-requests?status=PENDING
Entao vejo apenas as solicitacoes com status PENDING
```

**Cenario 3: Filtrar por tipo**
```
Dado que estou autenticado
Quando acesso GET /swap-requests?type=created
Entao vejo apenas as solicitacoes que eu criei

Quando acesso GET /swap-requests?type=received
Entao vejo apenas as solicitacoes que me enviaram
```

---

## User Story 4: Cancelar Solicitacao

**Prioridade**: P3

**Como** professor que criou uma solicitacao,
**Eu quero** cancelar uma solicitacao antes que seja aceita,
**Para** desistir da troca caso meus planos mudem.

### Cenarios de Aceitacao

**Cenario 1: Cancelar com sucesso**
```
Dado que criei uma solicitacao PENDING
Quando acesso PATCH /swap-requests/:id/cancel
Entao o status muda para CANCELLED
```

**Cenario 2: Cancelar apos aceita**
```
Dado que criei uma solicitacao ja APPROVED
Quando tento cancelar
Entao recebo erro "Apenas solicitacoes pendentes podem ser canceladas"
```

**Cenario 3: Nao autor**
```
Dado que nao sou o criador da solicitacao
Quando tento cancelar
Entao recebo erro "Apenas o criador pode cancelar"
```

---

## User Story 5: Inscrever-se em Aula

**Prioridade**: P3

**Como** professor,
**Eu quero** me increver em uma aula,
**Para** poder participar como substituto em potencial.

### Cenarios de Aceitacao

**Cenario 1: Inscrever-se com sucesso**
```
Dado que existe uma aula disponivel
E ninguem esta inscrito nela
Quando acesso POST /classes/:id/enroll
Entao fico vinculado como professor替代
E recebo confirmacao
```

**Cenario 2: Ja inscrito**
```
Dado que ja estou inscrito na aula
Quando tento me increver novamente
Entao recebo erro "Voce ja esta inscrito nesta aula"
```

**Cenario 3: Aula ja ocupada**
```
Dado que outro professor ja esta inscrito na aula
Quando tento me increver
Entao recebo erro "Aula ja esta inscrita por outro professor"
```

---

## User Story 6: Cancelar Inscricao

**Prioridade**: P3

**Como** professor,
**Eu quero** cancelar minha inscricao em uma aula,
**Para** nao ser mais considerado como substituto.

### Cenarios de Aceitacao

**Cenario 1: Cancelar inscricao**
```
Dado que estou inscrito em uma aula
Quando acesso DELETE /classes/:id/enroll
Entao minha inscricao e removida
```

**Cenario 2: Nao autorizado**
```
Dado que nao estou inscrito na aula
Quando tento cancelar inscricao
Entao recebo erro "Aula nao esta inscrita por ninguem"
```

---

## Matriz User Stories x Features

| User Story | Feature | Endpoint |
|------------|---------|----------|
| US1 | Criar SwapRequest | POST /swap-requests |
| US2 | Aceitar Swap | PATCH /swap-requests/:id/accept |
| US2 | Rejeitar Swap | PATCH /swap-requests/:id/reject |
| US3 | Listar SwapRequests | GET /swap-requests |
| US4 | Cancelar Swap | PATCH /swap-requests/:id/cancel |
| US5 | Inscrever-se | POST /classes/:id/enroll |
| US6 | Cancelar Inscricao | DELETE /classes/:id/enroll |

---

## Definition of Done (DoD)

Cada user story sera considerada completa quando:

- [ ] Codigo implementado conforme specification
- [ ] testes unitarios criados
- [ ] Build passando
- [ ] lint sem erros criticos
- [ ] Documentacao atualizada
- [ ] Testado via Postman/cURL