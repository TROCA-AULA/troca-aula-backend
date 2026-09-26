import { Injectable } from '@nestjs/common';
import { and, eq, isNull, or, gte, ne, sql, SQL } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { teacherWorkloadRecords } from '../../database/schema';

export interface CreateTeacherWorkloadRecordData {
  userId: number;
  schoolId: number;
  networkId: number;
  workloadTypeId: number;
  hours: number;
  ataOficialRef?: string;
  validFrom: Date;
  validTo?: Date;
  createdById: number;
}

@Injectable()
export class TeacherWorkloadRecordsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(data: CreateTeacherWorkloadRecordData) {
    const [record] = await this.drizzle.db
      .insert(teacherWorkloadRecords)
      .values({
        userId: data.userId,
        schoolId: data.schoolId,
        networkId: data.networkId,
        workloadTypeId: data.workloadTypeId,
        hours: String(data.hours),
        ataOficialRef: data.ataOficialRef,
        validFrom: data.validFrom.toISOString().slice(0, 10),
        validTo: data.validTo?.toISOString().slice(0, 10),
        createdById: data.createdById,
      })
      .returning();
    return record;
  }

  findAll(params: { schoolId?: number; userId?: number }) {
    const conditions: SQL[] = [];
    if (params.schoolId) conditions.push(eq(teacherWorkloadRecords.schoolId, params.schoolId));
    if (params.userId) conditions.push(eq(teacherWorkloadRecords.userId, params.userId));

    return this.drizzle.db.query.teacherWorkloadRecords.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { workloadType: true },
      orderBy: (fields, { desc }) => [desc(fields.validFrom)],
    });
  }

  findOne(id: number) {
    return this.drizzle.db.query.teacherWorkloadRecords.findFirst({
      where: eq(teacherWorkloadRecords.id, id),
      with: { workloadType: true },
    });
  }

  // Soma as horas hoje "vigentes" (sem data final, ou com data final no
  // futuro) do mesmo professor/escola/tipo — usada para validar contra o
  // limite da WorkloadPolicy antes de criar/editar um registro.
  // `excludeId` evita que o próprio registro sendo editado conte duas vezes.
  async sumActiveHours(
    schoolId: number,
    userId: number,
    workloadTypeId: number,
    excludeId?: number,
  ): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const conditions = [
      eq(teacherWorkloadRecords.schoolId, schoolId),
      eq(teacherWorkloadRecords.userId, userId),
      eq(teacherWorkloadRecords.workloadTypeId, workloadTypeId),
      or(isNull(teacherWorkloadRecords.validTo), gte(teacherWorkloadRecords.validTo, today))!,
    ];
    if (excludeId) {
      conditions.push(ne(teacherWorkloadRecords.id, excludeId));
    }

    const [row] = await this.drizzle.db
      .select({ total: sql<string>`coalesce(sum(${teacherWorkloadRecords.hours}), 0)` })
      .from(teacherWorkloadRecords)
      .where(and(...conditions));

    return Number(row?.total ?? 0);
  }

  async update(
    id: number,
    data: Partial<Omit<CreateTeacherWorkloadRecordData, 'userId' | 'schoolId' | 'networkId' | 'createdById'>>,
  ) {
    const [record] = await this.drizzle.db
      .update(teacherWorkloadRecords)
      .set({
        ...(data.workloadTypeId !== undefined && { workloadTypeId: data.workloadTypeId }),
        ...(data.hours !== undefined && { hours: String(data.hours) }),
        ...(data.ataOficialRef !== undefined && { ataOficialRef: data.ataOficialRef }),
        ...(data.validFrom !== undefined && {
          validFrom: data.validFrom.toISOString().slice(0, 10),
        }),
        ...(data.validTo !== undefined && {
          validTo: data.validTo.toISOString().slice(0, 10),
        }),
      })
      .where(eq(teacherWorkloadRecords.id, id))
      .returning();
    return record;
  }

  async remove(id: number) {
    const [record] = await this.drizzle.db
      .delete(teacherWorkloadRecords)
      .where(eq(teacherWorkloadRecords.id, id))
      .returning();
    return record;
  }
}
