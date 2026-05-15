# Research: Sistema de Troca de Aulas

**Date**: 2026-05-14 | **Feature**: SwapRequest

---

## Decisions Made

### 1. Adicionar campos de horário no modelo Class

**Decision**: Adicionar dayOfWeek, startTime, endTime diretamente no modelo Classes existente.

**Rationale**: Simplificação - aulas têm horários, não precisa de tabela separada.

**Alternatives considered**:
- Tabela Schedule separada (mais complexo, desnecessário para projeto acadêmico)

---

### 2. Definição de conflito de horário

**Decision**: Mesmo dia (dayOfWeek) + horário sobreposto.

**Rationale**: Regra clara e testável. Dois intervalos se sobrepõem se: startA < endB AND endA > startB.

**Alternatives considered**:
- Exatamente mesmo horário (muito restritivo)
- Mesmo período (manhã/tarde/noite) - impreciso

---

### 3. Autorização baseada em perfil

**Decision**: Verificar perfil do usuário (DIRETOR/AUXILIAR_ADMIN para criar, PROFESSOR para aceitar).

**Rationale**: O sistema já tem Profiles no schema.prisma. Usar profileId para autorização.

**Alternatives considered**:
- Role separada (adicionaria complexidade desnecessária)

---

### 4. Professor só aceita swap da matéria

**Decision**: Validar que target.subjectId = class.subjectId.

**Rationale**: Garante que professor só aceite aulas da sua disciplina.

---

## NEEDS CLARIFICATION Resolved

Todas as clarificações foram respondidas no `/speckit.clarify`:
1. ✅ Campos de horário precisam ser adicionados no schema
2. ✅ Conflito = mesmo dia + sobreposição
3. ✅ SC-001 (<30s) removido - não crítico para MVP
4. ✅ targetId no corpo da requisição
5. ✅ Autorização: diretor/admin cria, professor aceita da matéria