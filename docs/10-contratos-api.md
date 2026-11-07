# Contratos da API (formato das chamadas)

> **Atualizado em 2026-10-22.** A versão anterior deste arquivo usava porta 3000, um envelope `{data, message, statusCode}` que a API **não** usa e não tinha as rotas multi-tenant. Foi substituída por este resumo fiel ao código.
>
> - **Lista completa de rotas** (quem pode chamar, corpo, erros): [`03-endpoints.md`](./03-endpoints.md)
> - **Exemplos executáveis com o resultado esperado:** `docs/guias-de-teste/03-guia-api-requests.md` (raiz do projeto)
> - **Swagger:** `http://localhost:5000/api`

## 1. Endereço e autenticação

- Base local: `http://localhost:5000` (`PORT` no `.env`).
- Login:

  ```http
  POST /auth/login
  Content-Type: application/json

  {"email": "professor@escola.com", "password": "Senha@123"}
  ```

  Resposta `200`:

  ```json
  { "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
  ```

- Nas demais chamadas: `Authorization: Bearer <access_token>`.
- **Payload do JWT** (`sub`): o usuário sem a senha, com `upsUser: [{schoolId, userId, profileId, approvedAt, approvedById, networkId}]`. É daí que o front tira perfil, escolas e rede ativa.
  - ⚠️ Hoje o `networkId` desses vínculos vem `null` (defeito D5, efeito do RLS no login).
  - O token expira (`exp`) depois de `JWT_EXPIRES_IN` (padrão 12h). `POST /auth/refresh` devolve um token novo com os dados atuais; o front chama ao abrir/recarregar uma tela (`/api/auth/me?refresh=1`) e, num 401 por sessão vencida, avisa e volta ao login.
- **Frontend:** as telas **não** mandam o Bearer pelo navegador. O login grava o token num cookie `httpOnly` (`/api/auth/login` do Next), e as chamadas passam pelo proxy `/api/proxy/...`, que anexa o header no servidor.

## 2. Formato das respostas

| Situação | Formato |
|---|---|
| Sucesso com um item | O próprio objeto, ex.: `{"id": 1, "name": "EMEF Alfa", "networkId": 2, ...}` |
| Sucesso com lista | Array: `[{...}, {...}]` |
| Erro de regra/permissão | `{"message": "Você só pode se candidatar a aulas da sua matéria", "error": "Forbidden", "statusCode": 403}` |
| Erro de validação | `{"message": ["name should not be empty", "name must be a string"], "error": "Bad Request", "statusCode": 400}` |
| Erro inesperado | `{"statusCode": 500, "message": "Internal server error"}` — sempre é bug (ex.: D13) |

> Não há envelope `{data, message}`. Os services do front usam `response.data?.data ?? response.data`, que funciona nos dois formatos.

### Códigos usados

| Código | Quando |
|---|---|
| 200 / 201 | Sucesso (POST costuma devolver 201) |
| 400 | Dado inválido ou regra de negócio (pendente repetida, teto de horas, conflito, limite, fechar sem revisar...) |
| 401 | Sem token / token inválido / senha errada |
| 403 | Logado, mas sem permissão (perfil, escola, elegibilidade da vaga) |
| 404 | Recurso não existe |
| 501 | Gov.br (stub) |

## 3. Regras de envio

- `ValidationPipe` com `whitelist` e `forbidNonWhitelisted`: **campo extra no corpo gera 400** (`property X should not exist`).
- Mande `Content-Type: application/json` **só quando houver corpo**; com o header e o corpo vazio, o servidor responde 400 "Body cannot be empty when content-type is set to 'application/json'".
- Datas: ISO 8601 (`2026-10-23T10:00:00.000Z`); `validFrom/validTo` aceitam `YYYY-MM-DD`; `referenceMonth` é `YYYY-MM`.
- **Nomes com erro de digitação que são o contrato real** (não "corrija" no cliente): `Classes.createdByd`, `Classes.statededAt`, `Classes.registredById`.

## 4. Formato das entidades principais

```jsonc
// Usuário (nunca traz "password")
{ "id": 5, "name": "Prof. Ana", "email": "ana@escola.local", "phone": "16999990000",
  "subjectId": 2, "substitutionLimitPerSemester": null, "createdAt": "...", "deletedAt": null }

// Vínculo (POST /users/:id/assign-profile)
{ "schoolId": 2, "userId": 5, "profileId": 3, "createdAt": "...", "approvedAt": "...", "approvedById": 1 }

// Aula
{ "id": 10, "schoolId": 2, "subjectId": 2, "createdByd": 3, "statededAt": "...", "finishedAt": "...",
  "available": true, "enrolledById": null, "dayOfWeek": null, "startTime": null, "endTime": null,
  "createdAt": "...", "deletedAt": null,
  // em GET /classes vêm também: "school", "subject", "createdBy", "enrolledBy"
}

// Candidatura
{ "id": 7, "classId": 10, "professorId": 5, "status": "PENDING|APPROVED|REJECTED|CANCELLED",
  "createdAt": "...", "updatedAt": "..." }

// Limite de substituições
{ "current": 0, "limit": null, "percentage": 0, "canApply": true }

// Configuração de prioridade da escola (GET/POST /schools/:id/teacher-groups)
// Grupos em ordem de prioridade (0 recebe primeiro). Quem está sem grupo
// recebe em ungroupedEffectiveDelayMinutes (null = escola sem grupos: na hora).
{ "schoolId": 2, "ungroupedDelayMinutes": 120, "ungroupedEffectiveDelayMinutes": 120,
  "allowedNetworkIds": [3], "allowedNetworks": [ { "id": 3, "name": "Guariba" } ],
  "acceptedNetworkIds": null,
  "groups": [ { "id": 1, "name": "Professores da casa", "priority": 0, "delayMinutes": 0, "professorIds": [5] } ] }

// Coordenadores municipais (GET /network-coordinators)
[ { "userId": 9, "userName": "Lia", "userEmail": "lia@x.com", "userPhone": "1199",
    "networkId": 2, "networkName": "Jaboticabal", "approvedAt": "..." } ]

// Opções da tela de preferências (GET /professor-preferences/options)
{ "networks": [ { "id": 2, "name": "Jaboticabal" } ],
  "schools": [ { "id": 4, "name": "EMEF Alfa", "networkId": 2 } ] }

// Indicador
{ "totalVagas": 3, "cobertas": 1, "taxaCobertura": 0.333, "nivel": "baixo|medio|alto" }

// Relatório mensal
{ "id": 4, "userId": 5, "schoolId": 2, "referenceMonth": "2026-10", "status": "DRAFT|REVIEWED|CLOSED",
  "workloadBreakdown": { "AULA": 20, "SUPLEMENTAR": 6, "total": 26 },
  "reviewedById": null, "reviewedAt": null, "createdAt": "..." }
```

## 5. Ids fixos que o cliente pode assumir

| Tabela | Ids |
|---|---|
| Perfis | `1` DIRETOR · `2` AUXILIAR_ADMIN · `3` PROFESSOR · `4` MASTER · `5` COORDENADOR_MUNICIPAL (este vem de `UserNetworkLinks`, não de vínculo com escola) |
| Tipos de carga | `1` AULA · `2` PEDAGOGICO_COLETIVO · `3` LIVRE_ESCOLHA · `4` SUPLEMENTAR · `5` SUBSTITUICAO |
