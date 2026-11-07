import { Injectable } from '@nestjs/common';
import { and, eq, gte, isNull, lte, or, SQL } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  monthlyClosingReports,
  teacherWorkloadRecords,
} from '../../database/schema';

export interface WorkloadBreakdown {
  [workloadTypeCode: string]: number;
  total: number;
}

@Injectable()
export class MonthlyClosingReportsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  findByKey(userId: number, schoolId: number, referenceMonth: string) {
    return this.drizzle.db.query.monthlyClosingReports.findFirst({
      where: and(
        eq(monthlyClosingReports.userId, userId),
        eq(monthlyClosingReports.schoolId, schoolId),
        eq(monthlyClosingReports.referenceMonth, referenceMonth),
      ),
    });
  }

  findOne(id: number) {
    return this.drizzle.db.query.monthlyClosingReports.findFirst({
      where: eq(monthlyClosingReports.id, id),
    });
  }

  findAll(params: {
    userId?: number;
    schoolId?: number;
    referenceMonth?: string;
  }) {
    const conditions: SQL[] = [];
    if (params.userId)
      conditions.push(eq(monthlyClosingReports.userId, params.userId));
    if (params.schoolId)
      conditions.push(eq(monthlyClosingReports.schoolId, params.schoolId));
    if (params.referenceMonth)
      conditions.push(
        eq(monthlyClosingReports.referenceMonth, params.referenceMonth),
      );

    return this.drizzle.db.query.monthlyClosingReports.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: (fields, { desc }) => [desc(fields.referenceMonth)],
    });
  }

  // Soma as horas de TeacherWorkloadRecords do professor/escola cujo período
  // de vigência (validFrom/validTo) sobrepõe o mês de referência, agrupadas
  // pelo `code` do WorkloadType — é a agregação que vira `workloadBreakdown`.
  // Feita via relational query (join) + agregação em JS: volume por
  // professor/mês é baixo (no máximo alguns registros por categoria), não
  // justifica um GROUP BY em SQL para este caso de uso.
  async aggregateWorkload(
    userId: number,
    schoolId: number,
    referenceMonth: string,
  ): Promise<WorkloadBreakdown> {
    const [year, month] = referenceMonth.split('-').map(Number);
    const monthStart = `${referenceMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${referenceMonth}-${String(lastDay).padStart(2, '0')}`;

    const records = await this.drizzle.db.query.teacherWorkloadRecords.findMany(
      {
        where: and(
          eq(teacherWorkloadRecords.userId, userId),
          eq(teacherWorkloadRecords.schoolId, schoolId),
          lte(teacherWorkloadRecords.validFrom, monthEnd),
          or(
            isNull(teacherWorkloadRecords.validTo),
            gte(teacherWorkloadRecords.validTo, monthStart),
          ),
        ),
        with: { workloadType: true },
      },
    );

    const breakdown: WorkloadBreakdown = { total: 0 };
    for (const record of records) {
      const code = record.workloadType.code;
      const hours = Number(record.hours);
      breakdown[code] = (breakdown[code] ?? 0) + hours;
      breakdown.total += hours;
    }
    return breakdown;
  }

  async create(data: {
    userId: number;
    schoolId: number;
    referenceMonth: string;
    workloadBreakdown: WorkloadBreakdown;
  }) {
    const [report] = await this.drizzle.db
      .insert(monthlyClosingReports)
      .values({
        userId: data.userId,
        schoolId: data.schoolId,
        referenceMonth: data.referenceMonth,
        workloadBreakdown: data.workloadBreakdown,
        status: 'DRAFT',
      })
      .returning();
    return report;
  }

  async updateBreakdown(id: number, workloadBreakdown: WorkloadBreakdown) {
    const [report] = await this.drizzle.db
      .update(monthlyClosingReports)
      .set({ workloadBreakdown })
      .where(eq(monthlyClosingReports.id, id))
      .returning();
    return report;
  }

  async updateStatus(
    id: number,
    status: 'DRAFT' | 'REVIEWED' | 'CLOSED',
    reviewedById?: number,
  ) {
    const [report] = await this.drizzle.db
      .update(monthlyClosingReports)
      .set({
        status,
        // Reabrir (DRAFT) limpa a revisão anterior — o relatório volta a ser
        // um rascunho editável; rever/fechar de novo registra nova revisão.
        ...(status === 'DRAFT'
          ? { reviewedById: null, reviewedAt: null }
          : reviewedById !== undefined
            ? { reviewedById, reviewedAt: new Date() }
            : {}),
      })
      .where(eq(monthlyClosingReports.id, id))
      .returning();
    return report;
  }
}
