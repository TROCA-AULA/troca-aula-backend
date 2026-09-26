import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';

// Leitura só para MASTER — rastreabilidade é um instrumento de governança
// da plataforma, não algo que cada diretor de escola acessa livremente.
@Controller('audit-log')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ProfileName.MASTER)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('network/:networkId')
  findByNetwork(@Param('networkId') networkId: string) {
    return this.auditLogService.findByNetwork(+networkId);
  }

  @Get(':entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityType, +entityId);
  }
}
