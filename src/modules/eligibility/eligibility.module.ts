import { Global, Module } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { ProfessorPreferencesService } from './professor-preferences.service';
import {
  NetworkInterconnectionsService,
  SchoolPriorityTiersService,
} from './school-priority-tiers.service';
import { ProfessorPreferencesController } from './professor-preferences.controller';
import { SchoolPriorityTiersController } from './school-priority-tiers.controller';
import { NetworkInterconnectionsController } from './network-interconnections.controller';

// Global pelo mesmo motivo de TenantModule/DatabaseModule: a regra de
// visibilidade (Fase 5) é usada tanto pela listagem de aulas quanto pela
// candidatura, em módulos diferentes, sem que cada um precise importar.
@Global()
@Module({
  controllers: [
    ProfessorPreferencesController,
    SchoolPriorityTiersController,
    NetworkInterconnectionsController,
  ],
  providers: [
    EligibilityService,
    ProfessorPreferencesService,
    SchoolPriorityTiersService,
    NetworkInterconnectionsService,
  ],
  exports: [EligibilityService, ProfessorPreferencesService],
})
export class EligibilityModule {}
