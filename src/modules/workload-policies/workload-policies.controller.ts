import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkloadPoliciesService } from './workload-policies.service';
import { CreateWorkloadPolicyDto } from './dto/create-workload-policy.dto';
import { UpdateWorkloadPolicyDto } from './dto/update-workload-policy.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';

// Escrita só MASTER (é a Secretaria Municipal configurando as regras da
// rede). Leitura: qualquer usuário autenticado — restringir à(s) escola(s)
// da própria rede exigiria resolução de tenant por networkId, que o
// TenantGuard hoje não faz (só resolve schoolId); decisão de escopo
// documentada no Design Doc em vez de estender o guard reativamente aqui.
@Controller('workload-policies')
@UseGuards(AuthGuard)
export class WorkloadPoliciesController {
  constructor(private readonly workloadPoliciesService: WorkloadPoliciesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  create(@Body() dto: CreateWorkloadPolicyDto) {
    return this.workloadPoliciesService.create(dto);
  }

  @Get()
  findAll(@Query('networkId') networkId?: string) {
    return this.workloadPoliciesService.findAll(networkId ? +networkId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workloadPoliciesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  update(@Param('id') id: string, @Body() dto: UpdateWorkloadPolicyDto) {
    return this.workloadPoliciesService.update(+id, dto);
  }
}
