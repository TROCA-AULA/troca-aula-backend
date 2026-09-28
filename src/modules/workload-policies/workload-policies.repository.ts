import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CreateWorkloadPolicyDto } from './dto/create-workload-policy.dto';
import { UpdateWorkloadPolicyDto } from './dto/update-workload-policy.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { workloadPolicies } from '../../database/schema';

@Injectable()
export class WorkloadPoliciesRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateWorkloadPolicyDto) {
    const [policy] = await this.drizzle.db
      .insert(workloadPolicies)
      .values({
        networkId: dto.networkId,
        workloadTypeId: dto.workloadTypeId,
        maxHoursPerWeek:
          dto.maxHoursPerWeek !== undefined
            ? String(dto.maxHoursPerWeek)
            : null,
        ataOficialRequired: dto.ataOficialRequired,
      })
      .returning();
    return policy;
  }

  findAll(networkId?: number) {
    return this.drizzle.db
      .select()
      .from(workloadPolicies)
      .where(networkId ? eq(workloadPolicies.networkId, networkId) : undefined);
  }

  async findOne(id: number) {
    const [policy] = await this.drizzle.db
      .select()
      .from(workloadPolicies)
      .where(eq(workloadPolicies.id, id));
    return policy ?? null;
  }

  async findByNetworkAndType(networkId: number, workloadTypeId: number) {
    const [policy] = await this.drizzle.db
      .select()
      .from(workloadPolicies)
      .where(
        and(
          eq(workloadPolicies.networkId, networkId),
          eq(workloadPolicies.workloadTypeId, workloadTypeId),
        ),
      );
    return policy ?? null;
  }

  async update(id: number, dto: UpdateWorkloadPolicyDto) {
    const [policy] = await this.drizzle.db
      .update(workloadPolicies)
      .set({
        ...(dto.maxHoursPerWeek !== undefined && {
          maxHoursPerWeek: String(dto.maxHoursPerWeek),
        }),
        ...(dto.ataOficialRequired !== undefined && {
          ataOficialRequired: dto.ataOficialRequired,
        }),
      })
      .where(eq(workloadPolicies.id, id))
      .returning();
    return policy;
  }
}
