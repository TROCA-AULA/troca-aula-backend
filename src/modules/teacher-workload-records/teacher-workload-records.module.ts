import { Module } from '@nestjs/common';
import { TeacherWorkloadRecordsService } from './teacher-workload-records.service';
import { TeacherWorkloadRecordsController } from './teacher-workload-records.controller';
import { TeacherWorkloadRecordsRepository } from './teacher-workload-records.repository';
import { SchoolsModule } from '../schools/schools.module';
import { WorkloadPoliciesModule } from '../workload-policies/workload-policies.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SchoolsModule, WorkloadPoliciesModule, AuditLogModule],
  controllers: [TeacherWorkloadRecordsController],
  providers: [TeacherWorkloadRecordsRepository, TeacherWorkloadRecordsService],
})
export class TeacherWorkloadRecordsModule {}
