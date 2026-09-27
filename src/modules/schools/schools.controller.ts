import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdatePriorityWindowDto } from './dto/update-priority-window.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';

interface AuthenticatedRequest {
  user: { id: number };
}

// Escola é a própria entidade-tenant (Design Doc ADR-004) — só MASTER
// gerencia escolas. Leitura continua pública para qualquer usuário
// autenticado (comportamento existente preservado).
@Controller('schools')
@UseGuards(AuthGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(+id, updateSchoolDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(+id);
  }

  // "Cada escola tem sua regra de prioridade" - por isso DIRETOR/
  // AUXILIAR_ADMIN da própria escola também podem configurar, não só
  // MASTER (diferente das outras mutações deste controller). A posse da
  // escola específica é validada dentro do service, não aqui (ver
  // SchoolsService.updatePriorityWindow).
  @Patch(':id/priority-window')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.DIRETOR, ProfileName.AUXILIAR_ADMIN)
  updatePriorityWindow(
    @Param('id') id: string,
    @Body() dto: UpdatePriorityWindowDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.schoolsService.updatePriorityWindow(
      +id,
      dto.priorityWindowHours ?? null,
      req.user.id,
    );
  }
}
