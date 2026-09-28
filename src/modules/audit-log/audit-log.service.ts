import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { auditLog, users } from '../../database/schema';

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

  // Join com Users só para nome/e-mail de quem alterou (nunca `password` -
  // ver o mesmo achado de segurança corrigido em ClassesRepository) — sem
  // isso, a tela de auditoria só teria o `changedById` cru, ilegível pra
  // quem for consultar.
  private selectWithChangedBy() {
    return this.drizzle.db
      .select({
        id: auditLog.id,
        networkId: auditLog.networkId,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        changedById: auditLog.changedById,
        before: auditLog.before,
        after: auditLog.after,
        justification: auditLog.justification,
        changedAt: auditLog.changedAt,
        changedByName: users.name,
        changedByEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.changedById));
  }

  findByEntity(entityType: string, entityId: number) {
    return this.selectWithChangedBy()
      .where(
        and(
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId),
        ),
      )
      .orderBy(desc(auditLog.changedAt));
  }

  findByNetwork(networkId: number) {
    return this.selectWithChangedBy()
      .where(eq(auditLog.networkId, networkId))
      .orderBy(desc(auditLog.changedAt));
  }
}
