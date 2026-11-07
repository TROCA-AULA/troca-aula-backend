import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { SchoolsRepository } from './schools.repository';

// Exporta SchoolsRepository desde a Fase 2: TeacherWorkloadRecordsService
// precisa resolver `school.networkId` para localizar a WorkloadPolicy da
// rede antes de gravar um registro de carga horária.
@Module({
  controllers: [SchoolsController],
  providers: [SchoolsRepository, SchoolsService],
  exports: [SchoolsRepository],
})
export class SchoolsModule {}
