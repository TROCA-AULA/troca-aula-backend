import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

interface AuthenticatedRequest {
  user: { id: number };
}

// Rastreabilidade é governança: MASTER vê qualquer rede; o COORDENADOR_
// MUNICIPAL vê a trilha das redes que coordena. Diretor não acessa.
@Controller('audit-log')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ProfileName.MASTER)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Get('network/:networkId')
  @Roles(ProfileName.MASTER, ProfileName.COORDENADOR_MUNICIPAL)
  async findByNetwork(
    @Param('networkId') networkId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.tenantContextService.assertCanManageNetwork(
      req.user.id,
      +networkId,
    );
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
