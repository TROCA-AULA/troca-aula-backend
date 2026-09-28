<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Backend do sistema **Troca Aula** - plataforma para gerenciamento e facilitação de substituição de professores, evitando aulas vagas.

### Funcionalidades

- **Autenticação**: JWT com bcrypt (inclui `networkId` por vínculo e fluxo de senha)
- **CRUD**: Users, Schools, Subjects, Classes, Profiles
- **Multi-tenant**: Networks, WorkloadPolicies, TeacherWorkloadRecords, MonthlyClosingReports e AuditLog
- **Aulas Vagas**: fluxo "aula vaga → candidatura → aprovação da direção" (`enrollment-requests`)
- **Inscrição**: Professores podem se increver/desinscrever de aulas

### Tecnologias

- NestJS + TypeScript
- Drizzle ORM
- PostgreSQL
- Docker

## Documentação

Consulte a documentação completa na pasta `docs/`:

| Arquivo | Descrição |
|---------|-----------|
| [docs/01-visao-geral.md](docs/01-visao-geral.md) | Visão geral, propósito e objetivos do projeto |
| [docs/02-arquitetura-backend.md](docs/02-arquitetura-backend.md) | Arquitetura do backend, padrões e estruturas |
| [docs/03-endpoints.md](docs/03-endpoints.md) | Detalhamento completo de todos os endpoints |
| [docs/04-regras-negocio.md](docs/04-regras-negocio.md) | Regras de negócio e validações do sistema |
| [docs/05-user-stories.md](docs/05-user-stories.md) | User stories com cenários de aceitação |
| [docs/06-modelo-dados.md](docs/06-modelo-dados.md) | Modelo de dados e schema do banco |
| [docs/07-fluxos-negocio.md](docs/07-fluxos-negocio.md) | Fluxos de negócio com diagramas Mermaid |
| [docs/08-fluxo-banco.md](docs/08-fluxo-banco.md) | Fluxo de dados no banco de dados |
| [docs/documentacao-central-troca-aula.md](docs/documentacao-central-troca-aula.md) | Documentação central combinando backend e frontend |
| [docs/tutorial-teste-local-fluxos.md](docs/tutorial-teste-local-fluxos.md) | Tutorial passo a passo para testar localmente |
| [docs/checklist-qa-fluxos-locais.md](docs/checklist-qa-fluxos-locais.md) | Checklist de validação por perfil e regras de negócio |

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /auth/login | Login com email e senha |
| PATCH | /auth/change-password | Troca a senha do próprio usuário autenticado (`currentPassword`, `newPassword` com mínimo de 8 caracteres) |

O token JWT inclui os vínculos escola/perfil do usuário e, em cada vínculo, o
`networkId` da rede da escola — o frontend não precisa de uma segunda chamada
para resolver a rede ativa. O login também aceita e migra de forma lazy contas
no esquema de hash legado (SHA1+bcrypt), re-hasheando no primeiro login bem-sucedido.

### Users (Usuários)

Requer autenticação JWT.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /users/:id/reset-password | Gera senha temporária para o usuário (`tempPassword` devolvida uma única vez na resposta). MASTER em qualquer conta; DIRETOR/AUXILIAR_ADMIN apenas de usuário que compartilhe uma escola gerenciada por ele |

### Enrollment Requests (Candidatura a Aulas Vagas)

> **Nota de correção (2026-09):** esta seção descrevia um módulo `SwapRequest`
> ("troca direta entre professores") que **não existe mais** — foi
> implementado num ciclo anterior e removido do banco pela migration
> `remove_swap_requests`. O fluxo real, desde então, é "aula vaga →
> candidatura → aprovação da direção", abaixo.

Requer autenticação JWT (`Authorization: Bearer <token>`)

| Método | Endpoint | Descrição | Autorização |
|--------|----------|-----------|--------------|
| POST | /enrollment-requests/request/:classId | Professor se candidata a uma aula vaga | PROFESSOR, sujeito à disciplina e à janela de prioridade da escola (ver Design Doc) |
| GET | /enrollment-requests | Listar candidaturas (filtros: `status`, `classId`, `professorId`, `userId`, `schoolId`, `createdAfter`, `createdBefore`, `mes`) | Gestor vê da própria escola; professor vê as próprias |
| GET | /enrollment-requests/substitution-limit/:professorId | Status do limite de substituições do semestre atual (`current`, `limit`, `percentage`, `canApply`), calculado no servidor | O próprio professor, ou DIRETOR/AUXILIAR_ADMIN/MASTER |
| GET | /enrollment-requests/:id | Detalhar candidatura | Gestor da escola ou o próprio professor |
| PATCH | /enrollment-requests/:id/approve | Aprovar candidatura | DIRETOR, AUXILIAR_ADMIN ou MASTER da escola |
| PATCH | /enrollment-requests/:id/reject | Rejeitar candidatura | DIRETOR, AUXILIAR_ADMIN ou MASTER da escola |
| DELETE | /enrollment-requests/:id | Cancelar candidatura | Apenas o próprio professor (se PENDING) |

> **Nota (2026-09):** os endpoints multi-tenant (`Networks`, `WorkloadPolicies`,
> `TeacherWorkloadRecords`, `MonthlyClosingReports`, `AuditLog`,
> `GET /classes/coverage-stats` e `PATCH /schools/:id/priority-window`) estão
> documentados nas seções abaixo. Para o racional de arquitetura (ADR-004/005/006,
> RLS deliberadamente não ativado) ver `docs/design-doc-evolucao-multi-tenant.md`
> na raiz do projeto.

### Classes (Aulas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /classes/:id/enroll | Inscrever-se na aula |
| DELETE | /classes/:id/enroll | Cancelar inscrição |
| GET | /classes/coverage-stats | Indicador histórico de cobertura de aulas vagas (filtros opcionais `schoolId`, `subjectId`, `dayOfWeek`); exige vínculo aprovado quando `schoolId` é informado |

### Schools (Escolas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /schools | Listar escolas |
| POST | /schools | Criar escola (MASTER) |
| PATCH | /schools/:id/priority-window | Definir a janela de prioridade da escola (`priorityWindowHours`); MASTER ou gestor da própria escola |

### Networks (Redes)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /networks | Listar redes |
| GET | /networks/:id | Detalhar rede |
| POST | /networks | Criar rede (MASTER) |
| PATCH | /networks/:id | Atualizar rede (MASTER) |

Não há `DELETE`: apagar uma rede (e suas escolas, restringidas por FK) ainda não tem regra de negócio definida.

### Workload Policies (Políticas de Carga Horária)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /workload-policies | Listar políticas (filtro opcional `networkId`) |
| GET | /workload-policies/:id | Detalhar política |
| POST | /workload-policies | Criar política (MASTER) |
| PATCH | /workload-policies/:id | Atualizar política (MASTER) |

### Teacher Workload Records (Jornada Docente)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /teacher-workload-records/me | Próprios registros de jornada (qualquer usuário autenticado) |
| GET | /teacher-workload-records?schoolId= | Listar registros da escola (gestão, com vínculo aprovado na escola) |
| GET | /teacher-workload-records/:id | Detalhar registro |
| POST | /teacher-workload-records | Criar registro (gestão, com vínculo aprovado na escola); valida o teto de `WorkloadPolicies.maxHoursPerWeek` da rede |
| PATCH | /teacher-workload-records/:id | Atualizar registro (gestão da escola) |
| DELETE | /teacher-workload-records/:id | Remover registro (gestão da escola) |

Criação, edição e remoção são registradas em `AuditLog`.

### Monthly Closing Reports (Fechamento Mensal)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /monthly-closing-reports/generate | Gera (ou regera em `DRAFT`) o relatório do mês (`userId`, `schoolId`, `referenceMonth` em `YYYY-MM`) — gestão, com vínculo aprovado na escola |
| GET | /monthly-closing-reports | Listar relatórios (filtros `userId`, `schoolId`, `referenceMonth`) — gestão |
| GET | /monthly-closing-reports/:id | Detalhar relatório (dono do relatório ou gestão da escola) |
| PATCH | /monthly-closing-reports/:id/review | `DRAFT` → `REVIEWED` (gestão) |
| PATCH | /monthly-closing-reports/:id/close | `REVIEWED` → `CLOSED` (gestão; não permite pular de `DRAFT`) |
| PATCH | /monthly-closing-reports/:id/reopen | `REVIEWED`/`CLOSED` → `DRAFT` com justificativa obrigatória (gestão; registrado no `AuditLog`) |

### Audit Log (Auditoria)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /audit-log/network/:networkId | Consultar trilha de auditoria da rede (MASTER) |
| GET | /audit-log/:entityType/:entityId | Consultar trilha de auditoria de uma entidade (MASTER) |

### Regras de Negócio

1. **Criar aula vaga**: DIRETOR, AUXILIAR_ADMIN ou MASTER da escola
2. **Candidatar-se**: apenas professor da mesma matéria da aula, e só se a janela de prioridade da escola já permitir (ver Design Doc)
3. **Conflito de horário**: mesmo dia + horário sobreposto = conflito
4. **Aprovar/rejeitar**: DIRETOR, AUXILIAR_ADMIN ou MASTER da escola da aula
5. **Jornada docente**: a soma das horas vigentes por tipo não pode ultrapassar `WorkloadPolicies.maxHoursPerWeek` da rede; toda criação/edição/remoção é auditada
6. **Fechamento mensal**: `review` e `close` seguem `DRAFT → REVIEWED → CLOSED`; `reopen` exige justificativa e volta o relatório para `DRAFT`

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
