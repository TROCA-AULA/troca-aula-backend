import { DatabaseModule } from '../database/database.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './auth/tenant/tenant.module';
import { ClassesModule } from './classes/classes.module';
import { Class } from './classes/entities/class.entity';
import { EligibilityModule } from './eligibility/eligibility.module';
import { EmailModule } from './email/email.module';
import { EnrollmentRequestsModule } from './enrollment-requests/enrollment-requests.module';
import { MonthlyClosingReportsModule } from './monthly-closing-reports/monthly-closing-reports.module';
import { NetworksModule } from './networks/networks.module';
import { ProfileEnum } from './profile/profile.enum';
import { Profile } from './profile/entities/profile.entity';
import { ProfileModule } from './profile/profile.module';
import { School } from './schools/entities/school.entity';
import { SchoolsModule } from './schools/schools.module';
import { Subject } from './subjects/entities/subject.entity';
import { SubjectsModule } from './subjects/subjects.module';
import { TeacherWorkloadRecordsModule } from './teacher-workload-records/teacher-workload-records.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { WorkloadPoliciesModule } from './workload-policies/workload-policies.module';

// Smoke de wiring: nenhum destes módulos tem side effect no import (ex.: o
// DrizzleService, importado via DatabaseModule, só abre conexão no
// onModuleInit), então basta importar cada um e conferir que o decorator
// @Module registrou metadados.
const modules = {
  AuditLogModule,
  AuthModule,
  TenantModule,
  ClassesModule,
  EligibilityModule,
  EmailModule,
  EnrollmentRequestsModule,
  MonthlyClosingReportsModule,
  NetworksModule,
  ProfileModule,
  SchoolsModule,
  SubjectsModule,
  TeacherWorkloadRecordsModule,
  UsersModule,
  WorkloadPoliciesModule,
  DatabaseModule,
};

describe('modules smoke', () => {
  it.each(Object.entries(modules))(
    '%s está definido e tem metadados de @Module',
    (_name, moduleClass) => {
      expect(moduleClass).toBeDefined();
      expect(typeof moduleClass).toBe('function');
      expect(Reflect.getMetadataKeys(moduleClass).length).toBeGreaterThan(0);
    },
  );
});

describe('AuthModule wiring', () => {
  it('configura o JwtModule com o secret do ConfigService', () => {
    const dynamicImports = (Reflect.getMetadata('imports', AuthModule) ??
      []) as Array<{
      providers?: Array<{ useFactory?: (config: unknown) => unknown }>;
    }>;
    const jwtDynamicModule = dynamicImports.find((entry) =>
      Array.isArray(entry?.providers),
    );

    expect(jwtDynamicModule).toBeDefined();

    const configService = { get: jest.fn(() => 'super-secret') };
    const optionsProvider = jwtDynamicModule?.providers?.find(
      (provider) => typeof provider.useFactory === 'function',
    );

    expect(optionsProvider).toBeDefined();
    expect(optionsProvider?.useFactory?.(configService)).toEqual({
      secret: 'super-secret',
    });
    expect(configService.get).toHaveBeenCalledWith('secret');
  });
});

describe('ProfileEnum', () => {
  it('mapeia cada perfil para o id numérico', () => {
    expect(ProfileEnum.DIRETOR).toBe(1);
    expect(ProfileEnum.AUXILIAR_ADM).toBe(2);
    expect(ProfileEnum.PROFESSOR).toBe(3);
    expect(ProfileEnum.MASTER).toBe(4);
  });
});

describe('entities', () => {
  it('Class expõe id, schoolId e subjectId', () => {
    const entity = new Class();
    entity.id = 1;
    entity.schoolId = 2;
    entity.subjectId = 3;

    expect(entity).toEqual({ id: 1, schoolId: 2, subjectId: 3 });
  });

  it('Profile expõe id e name', () => {
    const entity = new Profile();
    entity.id = 1;
    entity.name = 'Diretor';

    expect(entity).toEqual({ id: 1, name: 'Diretor' });
  });

  it('School expõe id e name', () => {
    const entity = new School();
    entity.id = 1;
    entity.name = 'Escola Exemplo';

    expect(entity).toEqual({ id: 1, name: 'Escola Exemplo' });
  });

  it('Subject expõe id e name', () => {
    const entity = new Subject();
    entity.id = 1;
    entity.name = 'Matemática';

    expect(entity).toEqual({ id: 1, name: 'Matemática' });
  });

  it('User pode ser instanciado', () => {
    const entity = new User();

    expect(entity).toBeInstanceOf(User);
  });
});
