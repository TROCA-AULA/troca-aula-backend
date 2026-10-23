import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WorkloadPoliciesService } from './workload-policies.service';
import { CreateWorkloadPolicyDto } from './dto/create-workload-policy.dto';
import { UpdateWorkloadPolicyDto } from './dto/update-workload-policy.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

// Escrita: MASTER ou COORDENADOR_MUNICIPAL da rede (é a Secretaria
// Municipal configurando as regras da rede). Leitura: qualquer usuário autenticado — restringir à(s) escola(s)
// da própria rede exigiria resolução de tenant por networkId, que o
// TenantGuard hoje não faz (só resolve schoolId); decisão de escopo
// documentada no Design Doc em vez de estender o guard reativamente aqui.
interface AuthenticatedRequest {
  user: { id: number };
}

@Controller('workload-policies')
@UseGuards(AuthGuard)
export class WorkloadPoliciesController {
  constructor(
    private readonly workloadPoliciesService: WorkloadPoliciesService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  // MASTER em qualquer rede; COORDENADOR_MUNICIPAL só nas que coordena.
  @Post()
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.COORDENADOR_MUNICIPAL)
  async create(
    @Body() dto: CreateWorkloadPolicyDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.tenantContextService.assertCanManageNetwork(
      req.user.id,
      dto.networkId,
    );
    return this.workloadPoliciesService.create(dto);
  }

  @Get()
  findAll(@Query('networkId') networkId?: string) {
    return this.workloadPoliciesService.findAll(
      networkId ? +networkId : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workloadPoliciesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.COORDENADOR_MUNICIPAL)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkloadPolicyDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const policy = await this.workloadPoliciesService.findOne(+id);
    await this.tenantContextService.assertCanManageNetwork(
      req.user.id,
      policy.networkId,
    );
    return this.workloadPoliciesService.update(+id, dto);
  }
}
