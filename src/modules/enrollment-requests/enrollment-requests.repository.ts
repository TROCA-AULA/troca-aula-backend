import { Injectable } from '@nestjs/common';
import { and, count, eq, gte, lt, lte, SQL } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { classes, enrollmentRequest, usersProfilesSchools } from '../../database/schema';

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
    if (filters.status) conditions.push(eq(enrollmentRequest.status, filters.status));
    if (filters.classId) conditions.push(eq(enrollmentRequest.classId, filters.classId));
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
  async findAll(filters: EnrollmentRequestFilters) {
    const conditions = this.buildConditions(filters);
    if (filters.schoolId) {
      conditions.push(eq(classes.schoolId, filters.schoolId));
    }

    const rows = await this.drizzle.db
      .select({
        enrollmentRequest,
        schoolSince: usersProfilesSchools.approvedAt,
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
      .where(conditions.length ? and(...conditions) : undefined);

    return rows.map((row) => ({ ...row.enrollmentRequest, schoolSince: row.schoolSince }));
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

  findByClassAndProfessor(classId: number, professorId: number, status?: string) {
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
