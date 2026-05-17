# Pendências de Desenvolvimento

Este documento lista as funcionalidades que ainda não foram implementadas no backend, identificadas durante a análise do código e comparação com a documentação.

---

## Pendências Identificadas

### Backend - Funcionalidades Implementadas

| Item | Status | Observação |
|------|--------|------------|
| P1 - Controle de Limite de Substituições | ✅ Implementado | Campo `substitutionLimitPerSemester` em Schools |
| P2 - Integração Gov.br | ✅ Stub implementado | Endpoint retorna "recurso em desenvolvimento" |

---

## Para Desenvolvimento do Frontend

**Consulte o prompt completo em**: `docs/prompt.front.md`

Esse documento contém:
- Visão geral do projeto
- Stack técnico do backend
- Todos os contratos de API disponíveis
- Headers necessários
- Response format padrão
- Tarefa: criar/atualizar pendências do frontend

---

## Funcionalidades Já Implementadas

O backend já conta com as seguintes funcionalidades:

### Autenticação e Autorização
- Login JWT com bcrypt ✅
- Guards para rotas autenticadas ✅
- Validação de perfil (DIRETOR, PROFESSOR, AUXILIAR_ADMIN) ✅

### Módulos CRUD
- Users (usuários) ✅
- Schools (escolas) ✅
- Subjects (disciplinas) ✅
- Classes (aulas) ✅
- Profile (perfis) ✅

### Funcionalidades de Negócio
- Criação de aulas vagas ✅
- Sistema de candidaturas ✅
- Aprovação/rejeição de candidaturas ✅
- Verificação de conflito de horário ✅
- Verificação de habilitação por matéria ✅
- Verificação de disponibilidade de aula ✅
- Controle de permissões por perfil ✅

---

## Recomendações

### Para P1 — Controle de Limite

Sugestão de implementação:

```typescript
// Adicionar campo na entidade Schools (no schema.prisma)
model Schools {
  // ...campos existentes
  substitutionLimitPerSemester Int @default(10)
}

// Adicionar lógica no enrollment-requests.service.ts
async create(classId: number, professorId: number) {
  // ... validações existentes
  
  // NOVO: Verificar limite de substituições
  const professorSubstitutions = await this.countApprovedSubstitutions(professorId);
  const school = await this.getSchoolOfClass(classId);
  
  if (professorSubstitutions >= school.substitutionLimitPerSemester) {
    throw new BadRequestException('Limite de substituições atingido');
  }
  
  // ... restante da lógica
}
```

### Para P2 — Integração Gov.br

Sugestão de implementação:

```typescript
// Novo serviço: govbr-auth.service.ts
@Injectable()
export class GovBrAuthService {
  async validateToken(govBrToken: string): Promise<GovBrUser> {
    // Chamar API Gov.br para validar token
    // Retornar dados do usuário
  }
}

// Novo auth.controller.ts
@Post('login-govbr')
async loginGovBr(@Body() body: { token: string }) {
  const user = await this.govBrAuthService.validateToken(body.token);
  // Criar/validar usuário no sistema local
  // Retornar JWT interno
}
```

---

## Status Geral (Backend)

| Item | Status |
|------|--------|
| Módulos principais | ✅ Completo |
| Endpoints CRUD | ✅ Completo |
| Sistema de candidaturas | ✅ Completo |
| Controle de limite de substituições | ✅ Implementado |
| Integração Gov.br | ✅ Stub implementado |
| Documentação API | ✅ Atualizada |

---

## Próximos Passos

1. Execute o que está em `docs/prompt.front.md` para identificar pendências do frontend
2. Atualize este arquivo com as pendências encontradas

---

*Documento atualizado em: 2026-05-16*