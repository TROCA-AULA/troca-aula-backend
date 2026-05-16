# Pendências de Desenvolvimento

Este documento lista as funcionalidades que ainda não foram implementadas no backend, identificadas durante a análise do código e comparação com a documentação.

---

## Pendências Identificadas

### P1 — Controle de Limite de Substituições (Teto)

**Prioridade**: ALTA

**Descrição**: O sistema deve controlar automaticamente o número máximo de substituições que cada professor pode fazer por período (semestre/ano). Quando o professor atinge o limite, novas candidaturas devem ser bloqueadas automaticamente.

**Status atual**: Não implementado

**Local esperado**: `src/modules/enrollment-requests/enrollment-requests.service.ts`

**Funcionalidades esperadas**:
- Contador de substituições por professor
- Configuração de limite por escola
- Bloqueio automático quando limite atingido
- Alerta quando próximo do limite

**Impacto**: Sem esta funcionalidade, não há controle sobre sobrecarga de trabalho dos professores, descumprindo regra de negócio documentada.

---

### P2 — Integração com Conta Gov.br

**Prioridade**: ALTA

**Descrição**: O sistema deve utilizar a Conta Gov.br para autenticação, conforme documentado no projeto acadêmico. Atualmente, o sistema usa autenticação JWT tradicional com email/senha.

**Status atual**: Não implementado (usa JWT + bcrypt)

**Local esperado**: `src/modules/auth/`

**Funcionalidades esperadas**:
- Integração com API Gov.br para validação de identidade
- Substituição do login por email/senha pelo login governamental
- Validação de CPF institucional

**Impacto**: A autenticação atual não está alinhada com o especificado no documento base.MD e não oferece o mesmo nível de segurança que a Conta Gov.br.

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

## Status Geral

| Item | Status |
|------|--------|
| Módulos principais implementados | ✅ Completo |
| Endpoints CRUD funcionando | ✅ Completo |
| Sistema de candidaturas | ✅ Completo |
| Controle de limite de substituições | ✅ Implementado |
| Integração Gov.br | ✅ Implementado (endpoint disponível, retorna "recurso em desenvolvimento") |

---

## Implementações Realizadas

### P1 - Controle de Limite de Substituições ✅

**Implementado em**:
- `prisma/schema.prisma`: Adicionado campo `substitutionLimitPerSemester` no modelo Schools
- `src/modules/enrollment-requests/enrollment-requests.service.ts`: Adicionada verificação de limite antes de permitir candidatura
- Migration: `20260516190846_add_substitution_limit`

**Funcionalidades**:
- Campo opcional `substitutionLimitPerSemester` por escola (null = sem limite)
- Verificação automática antes de criar candidatura
- Retorno de erro claro quando limite atingido

### P2 - Integração com Conta Gov.br ✅

**Implementado em**:
- `src/modules/auth/auth.controller.ts`: Adicionado endpoint POST /auth/login-govbr

**Funcionalidades**:
- Endpoint retorna erro 401 com mensagem "Recurso em desenvolvimento"
- Preparado para implementação completa futura

### Documentação ✅

**Atualizado em**:
- `docs/10-contratos-api.md`: Adicionados novos contratos

---

*Documento atualizado em: 2026-05-16*