import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from '../guards/tenant.guard';
import { RolesGuard } from '../guards/roles.guard';

// Global pelo mesmo motivo que PrismaModule é global (removido nesta migração, ver docs/design-doc-evolucao-multi-tenant.md):
// TenantGuard/RolesGuard são referenciados via @UseGuards(...) em controllers
// de vários módulos (Subjects, Schools, Classes, Users) sem que cada um
// precise importar este módulo explicitamente.
@Global()
@Module({
  providers: [TenantContextService, TenantGuard, RolesGuard],
  exports: [TenantContextService, TenantGuard, RolesGuard],
})
export class TenantModule {}
