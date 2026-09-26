import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeacherWorkloadRecordsService } from './teacher-workload-records.service';
import { CreateTeacherWorkloadRecordDto } from './dto/create-teacher-workload-record.dto';
import { UpdateTeacherWorkloadRecordDto } from './dto/update-teacher-workload-record.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

interface AuthenticatedRequest {
  user: { id: number };
}

@Controller('teacher-workload-records')
@UseGuards(AuthGuard)
export class TeacherWorkloadRecordsController {
  constructor(private readonly service: TeacherWorkloadRecordsService) {}

  // schoolId vem do corpo — mesmo padrão de ClassesController.create.
  @Post()
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  create(
    @Body() dto: CreateTeacherWorkloadRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.id);
  }

  // Listagem "de gestão" por escola — exige perfil de gestão (não é a rota
  // que um professor usa para ver os próprios registros, ver /me abaixo).
  @Get()
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  findAll(@Query('schoolId') schoolId: string) {
    return this.service.findAll({ schoolId: +schoolId });
  }

  // Professor: só os próprios registros, qualquer escola.
  @Get('me')
  findOwn(@Request() req: AuthenticatedRequest) {
    return this.service.findOwn(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  // Sem schoolId garantido no corpo (DTO de update não exige) — RolesGuard
  // aqui é checagem grossa de perfil; a posse da escola específica do
  // registro é validada dentro do service (ver ClassesService.update).
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherWorkloadRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.update(+id, dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.remove(+id, req.user.id);
  }
}
