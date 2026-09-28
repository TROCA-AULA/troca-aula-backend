import {
  MODULE_METADATA,
  GLOBAL_MODULE_METADATA,
} from '@nestjs/common/constants';
import { EligibilityModule } from './eligibility.module';
import { EligibilityService } from './eligibility.service';
import { ProfessorPreferencesService } from './professor-preferences.service';
import {
  NetworkInterconnectionsService,
  SchoolTeacherGroupsService,
} from './school-teacher-groups.service';
import { ProfessorPreferencesController } from './professor-preferences.controller';
import { SchoolTeacherGroupsController } from './school-teacher-groups.controller';
import { NetworkInterconnectionsController } from './network-interconnections.controller';

// Smoke test do módulo: garante que ele importa sem erros e registra os
// controllers/providers da Fase 5 como Global (mesmo motivo do
// TenantModule/DatabaseModule: a regra de visibilidade é usada por outros
// módulos sem import explícito).
describe('EligibilityModule', () => {
  it('está definido', () => {
    expect(EligibilityModule).toBeDefined();
  });

  it('registra controllers e providers da Fase 5', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      EligibilityModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      EligibilityModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      EligibilityModule,
    ) as unknown[];

    expect(controllers).toEqual(
      expect.arrayContaining([
        ProfessorPreferencesController,
        SchoolTeacherGroupsController,
        NetworkInterconnectionsController,
      ]),
    );
    expect(providers).toEqual(
      expect.arrayContaining([
        EligibilityService,
        ProfessorPreferencesService,
        SchoolTeacherGroupsService,
        NetworkInterconnectionsService,
      ]),
    );
    expect(exports).toEqual(
      expect.arrayContaining([EligibilityService, ProfessorPreferencesService]),
    );
  });

  it('é global', () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, EligibilityModule)).toBe(
      true,
    );
  });
});
