import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { auditLog } from '../../database/schema';

// Rastreabilidade total (estágio Sr. Walter §6.3 / Design Doc Seção 5.3).
// `record()` é chamado por services de escrita (hoje só
// TeacherWorkloadRecordsService) — não há endpoint de escrita pública para
// AuditLog em si, só leitura (ver AuditLogController, MASTER-only).
@Injectable()
export class AuditLogService {
  constructor(private readonly drizzle: DrizzleService) {}

  async record(entry: {
    networkId: number;
    entityType: string;
    entityId: number;
    changedById: number;
    before?: unknown;
    after?: unknown;
    justification?: string;
  }) {
    const [row] = await this.drizzle.db
      .insert(auditLog)
      .values({
        networkId: entry.networkId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changedById: entry.changedById,
        before: entry.before ?? null,
        after: entry.after ?? null,
        justification: entry.justification ?? null,
      })
      .returning();
    return row;
  }

  findByEntity(entityType: string, entityId: number) {
    return this.drizzle.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.changedAt));
  }

  findByNetwork(networkId: number) {
    return this.drizzle.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.networkId, networkId))
      .orderBy(desc(auditLog.changedAt));
  }
}
