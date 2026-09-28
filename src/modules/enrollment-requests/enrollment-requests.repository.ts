import { Injectable } from '@nestjs/common';
import { and, count, eq, gte, inArray, lt, lte, SQL } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  classes,
  enrollmentRequest,
  subjects,
  users,
  usersProfilesSchools,
} from '../../database/schema';

export interface EnrollmentRequestCreateData {
  classId: number;
  professorId: number;
  status: string;
}

export interface EnrollmentRequestUpdateData {
  status?: string;
}

// Substitui o `where: Prisma.EnrollmentRequestWhereInput` genérico que o
// service montava antes (inclusive `where.class = { schoolId }`, um filtro
// relacional que só o Prisma resolve sozinho) por um objeto tipado — o join
// com Classes, quando `schoolId` é informado, é explícito no repository.
export interface EnrollmentRequestFilters {
  status?: string;
  classId?: number;
  professorId?: number;
  schoolId?: number;
  createdAtGte?: Date;
  createdAtLte?: Date;
  createdAtLt?: Date;
}

@Injectable()
export class EnrollmentRequestsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(data: EnrollmentRequestCreateData) {
    const [created] = await this.drizzle.db
      .insert(enrollmentRequest)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    return created;
  }

  private buildConditions(filters: EnrollmentRequestFilters) {
    const conditions: SQL[] = [];
    if (filters.status)
      conditions.push(eq(enrollmentRequest.status, filters.status));
    if (filters.classId)
      conditions.push(eq(enrollmentRequest.classId, filters.classId));
    if (filters.professorId) {
      conditions.push(eq(enrollmentRequest.professorId, filters.professorId));
    }
    if (filters.createdAtGte) {
      conditions.push(gte(enrollmentRequest.createdAt, filters.createdAtGte));
    }
    if (filters.createdAtLte) {
      conditions.push(lte(enrollmentRequest.createdAt, filters.createdAtLte));
    }
    if (filters.createdAtLt) {
      conditions.push(lt(enrollmentRequest.createdAt, filters.createdAtLt));
    }
    return conditions;
  }

  // "schoolSince" = approvedAt do vínculo do professor NAQUELA escola
  // específica (a mesma escola da aula candidatada) - "tempo de casa" que a
  // direção usa para decidir a quem dar preferência na aprovação (Design
  // Doc: regra de prioridade é informativa/manual, não um bloqueio rígido
  // no sistema). Sempre faz o join com Classes agora (antes só quando
  // filters.schoolId era informado) porque precisamos de classes.schoolId
  // para resolver o vínculo certo em qualquer listagem, não só a filtrada
  // por escola - sem mudança de comportamento (toda EnrollmentRequest tem
  // uma Classes válida via FK).
  // P7 (problemas-conhecidos.md do frontend): `user`/`professor` eram
  // campos que o tipo `EnrollmentRequest` já previa (denormalizados: nome,
  // e-mail, matéria, contador de substituições), mas nenhum endpoint real
  // os populava - a aba Candidaturas de `/master/professores` sempre
  // mostrou "-"/"0". Populado aqui com dois joins (Users, Subjects) + uma
  // segunda query agregada pro contador (evita subquery correlacionada por
  // linha; o conjunto de candidaturas de uma escola é pequeno o bastante
  // pra isso não custar nada na prática).
  async findAll(filters: EnrollmentRequestFilters) {
    const conditions = this.buildConditions(filters);
    if (filters.schoolId) {
      conditions.push(eq(classes.schoolId, filters.schoolId));
    }

    const rows = await this.drizzle.db
      .select({
        enrollmentRequest,
        schoolSince: usersProfilesSchools.approvedAt,
        professorName: users.name,
        professorEmail: users.email,
        professorSubjectId: users.subjectId,
        professorSubjectName: subjects.name,
      })
      .from(enrollmentRequest)
      .innerJoin(classes, eq(classes.id, enrollmentRequest.classId))
      .leftJoin(
        usersProfilesSchools,
        and(
          eq(usersProfilesSchools.userId, enrollmentRequest.professorId),
          eq(usersProfilesSchools.schoolId, classes.schoolId),
        ),
      )
      .leftJoin(users, eq(users.id, enrollmentRequest.professorId))
      .leftJoin(subjects, eq(subjects.id, users.subjectId))
      .where(conditions.length ? and(...conditions) : undefined);

    const professorIds = [
      ...new Set(rows.map((row) => row.enrollmentRequest.professorId)),
    ];
    const totalsByProfessor = new Map<number, number>();
    if (professorIds.length > 0) {
      const totals = await this.drizzle.db
        .select({ professorId: enrollmentRequest.professorId, total: count() })
        .from(enrollmentRequest)
        .where(
          and(
            inArray(enrollmentRequest.professorId, professorIds),
            eq(enrollmentRequest.status, 'APPROVED'),
          ),
        )
        .groupBy(enrollmentRequest.professorId);
      for (const t of totals) totalsByProfessor.set(t.professorId, t.total);
    }

    return rows.map((row) => ({
      ...row.enrollmentRequest,
      schoolSince: row.schoolSince,
      user: row.professorName
        ? {
            id: row.enrollmentRequest.professorId,
            name: row.professorName,
            email: row.professorEmail as string,
            subject: row.professorSubjectId
              ? {
                  id: row.professorSubjectId,
                  name: row.professorSubjectName as string,
                }
              : null,
            totalSubstitutions:
              totalsByProfessor.get(row.enrollmentRequest.professorId) ?? 0,
          }
        : undefined,
    }));
  }

  // Usado por EnrollmentRequestsService.countApprovedSubstitutions — troca
  // `prisma.enrollmentRequest.count()` por COUNT no banco em vez de trazer
  // as linhas todas para contar em memória.
  async count(filters: EnrollmentRequestFilters): Promise<number> {
    const conditions = this.buildConditions(filters);
    const [row] = await this.drizzle.db
      .select({ value: count() })
      .from(enrollmentRequest)
      .where(conditions.length ? and(...conditions) : undefined);
    return row?.value ?? 0;
  }

  async findOne(id: number) {
    const [request] = await this.drizzle.db
      .select()
      .from(enrollmentRequest)
      .where(eq(enrollmentRequest.id, id));
    return request ?? null;
  }

  async update(id: number, data: EnrollmentRequestUpdateData) {
    const [updated] = await this.drizzle.db
      .update(enrollmentRequest)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrollmentRequest.id, id))
      .returning();
    return updated;
  }

  findByClassAndProfessor(
    classId: number,
    professorId: number,
    status?: string,
  ) {
    const conditions = [
      eq(enrollmentRequest.classId, classId),
      eq(enrollmentRequest.professorId, professorId),
    ];
    if (status) conditions.push(eq(enrollmentRequest.status, status));
    return this.drizzle.db
      .select()
      .from(enrollmentRequest)
      .where(and(...conditions));
  }
}
