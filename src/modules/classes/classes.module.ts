import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { ClassesRepository } from './classes.repository';

// UsersModule não é mais importado aqui: ClassesService passou a usar
// TenantContextService (provido globalmente por TenantModule) em vez de
// UsersRepository diretamente — ver src/modules/auth/tenant/tenant.module.ts.
@Module({
  controllers: [ClassesController],
  providers: [ClassesRepository, ClassesService],
  exports: [ClassesRepository],
})
export class ClassesModule {}
