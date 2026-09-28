// Schema Drizzle — tradução 1:1 de `prisma/schema.prisma` (Fase 1 da migração
// Prisma -> Drizzle, ver docs/design-doc-evolucao-multi-tenant.md, ADR-002).
// Nomes de tabela/coluna preservados EXATAMENTE como estão no banco real
// (Prisma não usava @map/@@map, então os identificadores já eram PascalCase
// para tabelas e camelCase para colunas) — confirmado contra o banco vivo via
// `\d "Tabela"` em 2026-09-26, não só contra o schema.prisma.
//
// A partir daqui (bloco "Fase 2 — multi-tenant"), as tabelas novas seguem a
// Seção 5.3 do Design Doc (docs/design-doc-evolucao-multi-tenant.md).
// Decisão de escopo (ver nota antes de `teacherWorkloadRecords`): a
// denormalização de `networkId` prevista na ADR-005 foi aplicada SOMENTE
// onde já existe um consumidor real hoje (`teacherWorkloadRecords`,
// `auditLog`) — `classes`/`enrollmentRequest`/`usersProfilesSchools` NÃO
// ganharam a coluna nesta fase, porque nenhuma query ou política de RLS lê
// isso ainda (RLS está deliberadamente desativado nesta fase, ver ADR-001).
// Adicionar uma coluna sem leitor real hoje só para "deixar pronto" violaria
// o princípio "simples bem feito é melhor que o perfeito confuso e
// incompleto" do próprio pedido do time — fica registrado aqui como
// trabalho pendente para quando a ativação de RLS for de fato implementada.
import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  bigserial,
  integer,
  text,
  timestamp,
  date,
  numeric,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable('Profiles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export const users = pgTable(
  'Users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    password: text('password').notNull(),
    subjectId: integer('subjectId'),
    substitutionLimitPerSemester: integer('substitutionLimitPerSemester'),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    deletedAt: timestamp('deletedAt', { precision: 3 }),
  },
  (table) => [
    uniqueIndex('Users_email_key').on(table.email),
    index('Users_email_idx').on(table.email),
  ],
);

export const subjects = pgTable('Subjects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  deletedAt: timestamp('deletedAt', { precision: 3 }),
});

// Fase 2 — Rede de Ensino: fronteira real de isolamento entre clientes da
// plataforma (Design Doc, ADR-004). Uma escola pertence a exatamente uma
// rede; uma rede tem N escolas. Sem soft delete por ora — nenhuma regra de
// negócio para "desativar uma rede inteira" foi levantada ainda.
export const networks = pgTable('Networks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export const schools = pgTable('Schools', {
  id: serial('id').primaryKey(),
  // NOT NULL desde a criação da coluna nesta migration — o backfill para a
  // "Rede Padrão" acontece dentro da própria migration SQL, antes da
  // constraint ser aplicada (ver drizzle/migrations, arquivo desta fase).
  networkId: integer('networkId')
    .notNull()
    .references(() => networks.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  name: text('name').notNull(),
  substitutionLimitPerSemester: integer('substitutionLimitPerSemester'),
  // Regra de prioridade da própria escola (não da rede - diferente de
  // WorkloadPolicies, que é config por rede): quantas horas após a criação
  // de uma aula vaga ela fica visível só para professores vinculados a esta
  // escola, antes de abrir para professores externos. NULL = sem janela,
  // aberta imediatamente para todos (default retrocompatível). Configurado
  // pela própria direção da escola, não só pelo MASTER - ver
  // SchoolsController.updatePriorityWindow.
  priorityWindowHours: integer('priorityWindowHours'),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  deletedAt: timestamp('deletedAt', { precision: 3 }),
});

export const usersProfilesSchools = pgTable(
  'UsersProfilesSchools',
  {
    schoolId: integer('schoolId')
      .notNull()
      .references(() => schools.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    profileId: integer('profileId')
      .notNull()
      .references(() => profiles.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    approvedAt: timestamp('approvedAt', { precision: 3 }),
    approvedById: integer('approvedById').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.profileId, table.schoolId] }),
    index('UsersProfilesSchools_schoolId_idx').on(table.schoolId),
    index('UsersProfilesSchools_userId_idx').on(table.userId),
    index('UsersProfilesSchools_profileId_idx').on(table.profileId),
  ],
);

export const classes = pgTable('Classes', {
  id: serial('id').primaryKey(),
  schoolId: integer('schoolId')
    .notNull()
    .references(() => schools.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  subjectId: integer('subjectId')
    .notNull()
    .references(() => subjects.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  createdByd: integer('createdByd')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  registredById: integer('registredById').references(() => users.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  approvedById: integer('approvedById').references(() => users.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  profileId: integer('profileId').references(() => profiles.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  finishedAt: timestamp('finishedAt', { precision: 3 }),
  deletedAt: timestamp('deletedAt', { precision: 3 }),
  statededAt: timestamp('statededAt', { precision: 3 }),
  approvedAt: timestamp('approvedAt', { precision: 3 }),
  dayOfWeek: integer('dayOfWeek'),
  startTime: text('startTime'),
  endTime: text('endTime'),
  enrolledById: integer('enrolledById').references(() => users.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  available: boolean('available').notNull().default(true),
});

export const enrollmentRequest = pgTable(
  'EnrollmentRequest',
  {
    id: serial('id').primaryKey(),
    classId: integer('classId')
      .notNull()
      .references(() => classes.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    professorId: integer('professorId')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    // Prisma: String @default("PENDING") — nunca foi um enum nativo do
    // Postgres, então vira `text` livre aqui também (sem mudança de schema).
    status: text('status').notNull().default('PENDING'),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    // Prisma populava isso via @updatedAt (client-side, não trigger de banco).
    // Drizzle não tem equivalente automático — repositories/services que
    // fazem update() devem setar updatedAt: new Date() explicitamente.
    updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
  },
  (table) => [
    index('EnrollmentRequest_classId_idx').on(table.classId),
    index('EnrollmentRequest_professorId_idx').on(table.professorId),
    index('EnrollmentRequest_status_idx').on(table.status),
  ],
);

// Fase 2 — catálogo GLOBAL de tipos de carga horária (ADR-003 aplicado aqui
// também: são categorias definidas por legislação nacional/estadual de
// jornada docente, não algo que cada rede reinventa). As 5 linhas fixas são
// semeadas na migration desta fase, não via endpoint de escrita — não há
// controller para esta tabela.
export const workloadTypes = pgTable(
  'WorkloadTypes',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('WorkloadTypes_code_key').on(table.code)],
);

// Fase 2 — configuração de carga horária POR REDE (Design Doc, Seção 4: "o
// que é comum" vs. "o que é configurável por rede"). Só MASTER escreve;
// qualquer usuário autenticado vinculado a uma escola da rede pode ler.
export const workloadPolicies = pgTable(
  'WorkloadPolicies',
  {
    id: serial('id').primaryKey(),
    networkId: integer('networkId')
      .notNull()
      .references(() => networks.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    workloadTypeId: integer('workloadTypeId')
      .notNull()
      .references(() => workloadTypes.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    maxHoursPerWeek: numeric('maxHoursPerWeek', { precision: 6, scale: 2 }),
    ataOficialRequired: boolean('ataOficialRequired').notNull().default(true),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('WorkloadPolicies_networkId_workloadTypeId_key').on(
      table.networkId,
      table.workloadTypeId,
    ),
    index('WorkloadPolicies_networkId_idx').on(table.networkId),
  ],
);

// Fase 2 — "Jornada Docente" (estágio Sr. Walter §1): registro individual de
// carga de um professor numa escola, por tipo. `networkId` é denormalizado
// aqui (ao contrário de `classes`/`enrollmentRequest`) porque o service de
// validação (TeacherWorkloadRecordsService) precisa localizar a
// WorkloadPolicy da rede a cada escrita — ter o valor direto na linha evita
// um join escola->rede em toda validação, sem exigir RLS para isso.
export const teacherWorkloadRecords = pgTable(
  'TeacherWorkloadRecords',
  {
    id: serial('id').primaryKey(),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    schoolId: integer('schoolId')
      .notNull()
      .references(() => schools.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    networkId: integer('networkId')
      .notNull()
      .references(() => networks.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    workloadTypeId: integer('workloadTypeId')
      .notNull()
      .references(() => workloadTypes.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    hours: numeric('hours', { precision: 6, scale: 2 }).notNull(),
    ataOficialRef: text('ataOficialRef'),
    validFrom: date('validFrom').notNull(),
    validTo: date('validTo'),
    createdById: integer('createdById')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index('TeacherWorkloadRecords_schoolId_userId_validFrom_idx').on(
      table.schoolId,
      table.userId,
      table.validFrom,
    ),
    index('TeacherWorkloadRecords_networkId_workloadTypeId_idx').on(
      table.networkId,
      table.workloadTypeId,
    ),
  ],
);

// Fase 2 — relatório mensal de fechamento de ponto (estágio Sr. Walter §6).
// Sem lógica de geração automática ainda (fica para um ciclo futuro) — só o
// CRUD de transição de status DRAFT -> REVIEWED -> CLOSED.
export const monthlyClosingReports = pgTable(
  'MonthlyClosingReports',
  {
    id: serial('id').primaryKey(),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    schoolId: integer('schoolId')
      .notNull()
      .references(() => schools.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    referenceMonth: text('referenceMonth').notNull(),
    workloadBreakdown: jsonb('workloadBreakdown').notNull(),
    status: text('status').notNull().default('DRAFT'),
    reviewedById: integer('reviewedById').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    reviewedAt: timestamp('reviewedAt', { precision: 3 }),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('MonthlyClosingReports_userId_schoolId_referenceMonth_key').on(
      table.userId,
      table.schoolId,
      table.referenceMonth,
    ),
  ],
);

// Fase 2 — rastreabilidade total (estágio Sr. Walter §6.3). Escrito hoje só
// a partir de TeacherWorkloadRecordsService (create/update/remove); leitura
// exposta só para MASTER.
export const auditLog = pgTable(
  'AuditLog',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    networkId: integer('networkId')
      .notNull()
      .references(() => networks.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    entityType: text('entityType').notNull(),
    entityId: integer('entityId').notNull(),
    changedById: integer('changedById')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    before: jsonb('before'),
    after: jsonb('after'),
    justification: text('justification'),
    changedAt: timestamp('changedAt', { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index('AuditLog_networkId_entityType_entityId_idx').on(
      table.networkId,
      table.entityType,
      table.entityId,
    ),
  ],
);

// --- Relations (habilitam a Relational Query API: db.query.users.findFirst({ with: {...} })) ---

export const profilesRelations = relations(profiles, ({ many }) => ({
  upsProfile: many(usersProfilesSchools),
  classProfile: many(classes),
}));

export const usersRelations = relations(users, ({ many }) => ({
  upsUser: many(usersProfilesSchools, { relationName: 'upsUser' }),
  approvedLinks: many(usersProfilesSchools, { relationName: 'approver' }),
  classesCreated: many(classes, { relationName: 'classCreator' }),
  classesRegistered: many(classes, { relationName: 'classRegistrar' }),
  classesApproved: many(classes, { relationName: 'classApprover' }),
  classesEnrolled: many(classes, { relationName: 'enrolledClasses' }),
  enrollmentRequests: many(enrollmentRequest),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  classSubject: many(classes),
}));

export const networksRelations = relations(networks, ({ many }) => ({
  schools: many(schools),
  workloadPolicies: many(workloadPolicies),
  auditLog: many(auditLog),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  network: one(networks, {
    fields: [schools.networkId],
    references: [networks.id],
  }),
  upsSchool: many(usersProfilesSchools),
  classSchool: many(classes),
}));

export const workloadTypesRelations = relations(workloadTypes, ({ many }) => ({
  workloadPolicies: many(workloadPolicies),
  teacherWorkloadRecords: many(teacherWorkloadRecords),
}));

export const workloadPoliciesRelations = relations(
  workloadPolicies,
  ({ one }) => ({
    network: one(networks, {
      fields: [workloadPolicies.networkId],
      references: [networks.id],
    }),
    workloadType: one(workloadTypes, {
      fields: [workloadPolicies.workloadTypeId],
      references: [workloadTypes.id],
    }),
  }),
);

export const teacherWorkloadRecordsRelations = relations(
  teacherWorkloadRecords,
  ({ one }) => ({
    user: one(users, {
      fields: [teacherWorkloadRecords.userId],
      references: [users.id],
      relationName: 'workloadOwner',
    }),
    school: one(schools, {
      fields: [teacherWorkloadRecords.schoolId],
      references: [schools.id],
    }),
    network: one(networks, {
      fields: [teacherWorkloadRecords.networkId],
      references: [networks.id],
    }),
    workloadType: one(workloadTypes, {
      fields: [teacherWorkloadRecords.workloadTypeId],
      references: [workloadTypes.id],
    }),
    createdBy: one(users, {
      fields: [teacherWorkloadRecords.createdById],
      references: [users.id],
      relationName: 'workloadRecorder',
    }),
  }),
);

export const monthlyClosingReportsRelations = relations(
  monthlyClosingReports,
  ({ one }) => ({
    user: one(users, {
      fields: [monthlyClosingReports.userId],
      references: [users.id],
      relationName: 'closingReportOwner',
    }),
    school: one(schools, {
      fields: [monthlyClosingReports.schoolId],
      references: [schools.id],
    }),
    reviewedBy: one(users, {
      fields: [monthlyClosingReports.reviewedById],
      references: [users.id],
      relationName: 'closingReportReviewer',
    }),
  }),
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  network: one(networks, {
    fields: [auditLog.networkId],
    references: [networks.id],
  }),
  changedBy: one(users, {
    fields: [auditLog.changedById],
    references: [users.id],
  }),
}));

export const usersProfilesSchoolsRelations = relations(
  usersProfilesSchools,
  ({ one }) => ({
    school: one(schools, {
      fields: [usersProfilesSchools.schoolId],
      references: [schools.id],
    }),
    user: one(users, {
      fields: [usersProfilesSchools.userId],
      references: [users.id],
      relationName: 'upsUser',
    }),
    profile: one(profiles, {
      fields: [usersProfilesSchools.profileId],
      references: [profiles.id],
    }),
    approvedBy: one(users, {
      fields: [usersProfilesSchools.approvedById],
      references: [users.id],
      relationName: 'approver',
    }),
  }),
);

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  subject: one(subjects, {
    fields: [classes.subjectId],
    references: [subjects.id],
  }),
  createdBy: one(users, {
    fields: [classes.createdByd],
    references: [users.id],
    relationName: 'classCreator',
  }),
  registredBy: one(users, {
    fields: [classes.registredById],
    references: [users.id],
    relationName: 'classRegistrar',
  }),
  approvedBy: one(users, {
    fields: [classes.approvedById],
    references: [users.id],
    relationName: 'classApprover',
  }),
  profile: one(profiles, {
    fields: [classes.profileId],
    references: [profiles.id],
  }),
  enrolledBy: one(users, {
    fields: [classes.enrolledById],
    references: [users.id],
    relationName: 'enrolledClasses',
  }),
  enrollmentRequests: many(enrollmentRequest),
}));

export const enrollmentRequestRelations = relations(
  enrollmentRequest,
  ({ one }) => ({
    class: one(classes, {
      fields: [enrollmentRequest.classId],
      references: [classes.id],
    }),
    professor: one(users, {
      fields: [enrollmentRequest.professorId],
      references: [users.id],
    }),
  }),
);

export const schema = {
  profiles,
  users,
  subjects,
  schools,
  usersProfilesSchools,
  classes,
  enrollmentRequest,
  networks,
  workloadTypes,
  workloadPolicies,
  teacherWorkloadRecords,
  monthlyClosingReports,
  auditLog,
  profilesRelations,
  usersRelations,
  subjectsRelations,
  schoolsRelations,
  usersProfilesSchoolsRelations,
  classesRelations,
  enrollmentRequestRelations,
  networksRelations,
  workloadTypesRelations,
  workloadPoliciesRelations,
  teacherWorkloadRecordsRelations,
  monthlyClosingReportsRelations,
  auditLogRelations,
};
