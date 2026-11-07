import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/configuration';
import { UsersModule } from './modules/users/users.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ProfileModule } from './modules/profile/profile.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EnrollmentRequestsModule } from './modules/enrollment-requests/enrollment-requests.module';
import { TenantModule } from './modules/auth/tenant/tenant.module';
import { NetworksModule } from './modules/networks/networks.module';
import { WorkloadPoliciesModule } from './modules/workload-policies/workload-policies.module';
import { TeacherWorkloadRecordsModule } from './modules/teacher-workload-records/teacher-workload-records.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { MonthlyClosingReportsModule } from './modules/monthly-closing-reports/monthly-closing-reports.module';
import { EligibilityModule } from './modules/eligibility/eligibility.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    DatabaseModule,
    TenantModule,
    UsersModule,
    AuthModule,
    SchoolsModule,
    SubjectsModule,
    ClassesModule,
    ProfileModule,
    EnrollmentRequestsModule,
    NetworksModule,
    WorkloadPoliciesModule,
    AuditLogModule,
    TeacherWorkloadRecordsModule,
    MonthlyClosingReportsModule,
    EligibilityModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
