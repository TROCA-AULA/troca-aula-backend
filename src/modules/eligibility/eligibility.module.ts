import { Global, Module } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { ProfessorPreferencesService } from './professor-preferences.service';
import {
  NetworkInterconnectionsService,
  SchoolTeacherGroupsService,
} from './school-teacher-groups.service';
import { ProfessorPreferencesController } from './professor-preferences.controller';
import { SchoolTeacherGroupsController } from './school-teacher-groups.controller';
import { NetworkInterconnectionsController } from './network-interconnections.controller';

// Global pelo mesmo motivo de TenantModule/DatabaseModule: a regra de
// visibilidade (Fase 5) é usada tanto pela listagem de aulas quanto pela
// candidatura, em módulos diferentes, sem que cada um precise importar.
@Global()
@Module({
  controllers: [
    ProfessorPreferencesController,
    SchoolTeacherGroupsController,
    NetworkInterconnectionsController,
  ],
  providers: [
    EligibilityService,
    ProfessorPreferencesService,
    SchoolTeacherGroupsService,
    NetworkInterconnectionsService,
  ],
  exports: [EligibilityService, ProfessorPreferencesService],
})
export class EligibilityModule {}
