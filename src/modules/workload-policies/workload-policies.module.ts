import { Module } from '@nestjs/common';
import { WorkloadPoliciesService } from './workload-policies.service';
import { WorkloadPoliciesController } from './workload-policies.controller';
import { WorkloadPoliciesRepository } from './workload-policies.repository';

@Module({
  controllers: [WorkloadPoliciesController],
  providers: [WorkloadPoliciesRepository, WorkloadPoliciesService],
  exports: [WorkloadPoliciesRepository],
})
export class WorkloadPoliciesModule {}
