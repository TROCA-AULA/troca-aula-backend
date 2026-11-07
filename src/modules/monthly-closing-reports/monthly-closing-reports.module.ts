import { Module } from '@nestjs/common';
import { MonthlyClosingReportsService } from './monthly-closing-reports.service';
import { MonthlyClosingReportsController } from './monthly-closing-reports.controller';
import { MonthlyClosingReportsRepository } from './monthly-closing-reports.repository';
import { SchoolsModule } from '../schools/schools.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SchoolsModule, AuditLogModule],
  controllers: [MonthlyClosingReportsController],
  providers: [MonthlyClosingReportsRepository, MonthlyClosingReportsService],
})
export class MonthlyClosingReportsModule {}
