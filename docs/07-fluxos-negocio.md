# Fluxos de Negocio

## Fluxo Macro: Sistema de Troca de Aulas

```mermaid
flowchart TD
    A[Inicio] --> B{Usuario logado?}
    
    B -->|Nao| C[Login]
    C --> D[Recebe JWT]
    D --> B
    
    B -->|Sim| E{Tipo de usuario}
    
    E -->|DIRETOR| F[Criar SwapRequest]
    E -->|PROFESSOR| G[Aceitar/Rejeitar Swap]
    E -->|PROFESSOR| H[Inscrever-se em aula]
    
    F --> I{Conflito?}
    I -->|Sim| J[Erro: Conflito]
    I -->|Nao| K[Cria PENDING]
    
    G --> L{Same subject?}
    L -->|Nao| M[Erro: Wrong materia]
    L -->|Sim| N[Atualiza status]
    
    H --> O{Aula disponivel?}
    O -->|Nao| P[Erro: Ocupada]
    O -->|Sim| Q[Inscreve professor]
    
    K --> R[Notifica target]
    N --> S[Registro completo]
    Q --> S
    
    R --> S
```

---

## Fluxo 1: Criar Solicitacao de Troca

```mermaid
sequenceDiagram
    participant Director as Diretor
    participant API as Backend
    participant DB as Banco

    Director->>API: POST /swap-requests<br/>{classId, targetId}
    
    API->>DB: Buscar usuario (director)
    DB->>API: Usuario encontrado
    
    API->>API: Verificar perfil (DIRETOR/AUXILIAR_ADMIN)
    
    alt Nao autorizado
        API->>Director: 403 Forbidden
    else Autorizado
        API->>DB: Buscar aula (classId)
        DB->>API: Aula encontrada
        
        API->>DB: Verificar conflitos de horario
        DB->>API: Resultado
        
        alt Tem conflito
            API->>Director: 400 Conflito de horario
        else Sem conflito
            API->>DB: Criar SwapRequest (PENDING)
            DB->>API: Criado
            
            API->>Director: 201 Created<br/>{id, status: PENDING}
        end
    end
```

---

## Fluxo 2: Aceitar/Rejeitar Troca

```mermaid
sequenceDiagram
    participant Professor as Professor替代
    participant API as Backend
    participant DB as Banco

    Professor->>API: PATCH /swap-requests/:id/accept
    
    API->>DB: Buscar SwapRequest
    DB->>API: Solicitacao
    
    alt Status != PENDING
        API->>Professor: 400 Nao esta pendente
    else PENDING
        API->>DB: Buscar professor (target)
        DB->>API: Professor encontrado
        
        API->>DB: Buscar aula e materia
        DB->>API: Aula + Subject
        
        API->>API: Verificar mesma materia
        
        alt Materia diferente
            API->>Professor: 403 Wrong materia
        else Mesma materia
            API->>DB: Atualizar status -> APPROVED
            DB->>API: Atualizado
            
            API->>Professor: 200 OK<br/>{status: APPROVED}
        end
    end
```

---

## Fluxo 3: Cancelar Solicitacao

```mermaid
sequenceDiagram
    participant Requester as Criador
    participant API as Backend
    participant DB as Banco

    Requester->>API: PATCH /swap-requests/:id/cancel
    
    API->>DB: Buscar SwapRequest
    DB->>API: Solicitacao
    
    alt Status != PENDING
        API->>Requester: 400 Nao esta pendente
    else PENDING
        API->>API: Verificar se e o criador
        
        alt Nao e criador
            API->>Requester: 403 Nao autorizado
        else E o criador
            API->>DB: Atualizar status -> CANCELLED
            DB->>API: Atualizado
            
            API->>Requester: 200 OK<br/>{status: CANCELLED}
        end
    end
```

---

## Fluxo 4: Inscrever-se em Aula

```mermaid
sequenceDiagram
    participant Professor as Professor
    participant API as Backend
    participant DB as Banco

    Professor->>API: POST /classes/:id/enroll
    
    API->>DB: Buscar aula (classId)
    DB->>API: Aula encontrada
    
    alt Ja inscrita por outro
        API->>Professor: 400 Ja inscrita
    else Livre
        API->>DB: Buscar professor (userId)
        DB->>API: Professor encontrado
        
        API->>DB: Atualizar enrolledById
        DB->>API: Atualizado
        
        API->>Professor: 200 OK<br/>{enrolledById: userId}
    end
```

---

## Fluxo 5: Listar Solicitacoes

```mermaid
flowchart TB
    A[GET /swap-requests] --> B{Tem filtro type?}
    
    B -->|type=created| C[where: requesterId = userId]
    B -->|type=received| D[where: targetId = userId]
    B -->|sem filtro| E[where: requesterId OR targetId = userId]
    
    C --> F[Query DB]
    D --> F
    E --> F
    
    F --> G{Status filter?}
    G -->|Sim| H[Adicionar status ao where]
    G -->|Nao| I[Executar query]
    
    H --> I
    I --> J[Retornar lista]
```

---

## Fluxo 6: Autenticacao (Login)

```mermaid
sequenceDiagram
    participant User as Usuario
    participant API as Backend
    participant DB as Banco

    User->>API: POST /auth/login<br/>{email, password}
    
    API->>DB: Buscar usuario por email
    DB->>API: Usuario ou null
    
    alt Usuario nao existe
        API->>User: 401 Unauthorized
    else Existe
        API->>API: Comparar senha (bcrypt)
        
        alt Senha incorreta
            API->>User: 401 Unauthorized
        else Senha correta
            API->>API: Gerar JWT token
            
            API->>User: 200 OK<br/>{access_token}
        end
    end
```

---

## Fluxo 7: Deteccao de Conflito de Horario

```mermaid
flowchart TD
    A[Verificar Conflito] --> B[dayOfWeek valido?]
    
    B -->|Nao| C[Return false]
    B -->|Sim| D[Buscar aulas do target<br/>no mesmo dayOfWeek]
    
    D --> E{Cada aula}
    
    E -->|Aula com horario| F{Horarios sobrepoem?}
    F -->|Sim| G[Return true (conflito)]
    F -->|Nao| E
    E -->|Sem mais| H[Return false (sem conflito)]
    
    G --> I[Fim]
    H --> I
    C --> I
    
    style G fill:#ff6b6b
    style C fill:#51cf66
    style H fill:#51cf66
```

---

## Resumo dos Fluxos

| Fluxo | Ator Principal | Descricao |
|-------|----------------|-----------|
| 1 | Diretor | Criar solicitacao de troca |
| 2 | Professor替代 | Aceitar/rejeitar solicitacao |
| 3 | Criador | Cancelar solicitacao |
| 4 | Professor | Inscrever-se em aula |
| 5 | Usuario | Listar solicitacoes |
| 6 | Usuario | Login e autenticacao |
| 7 | Sistema | Verificar conflitos |