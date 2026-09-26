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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { GetClassDto } from './dto/get-class.dto';
import { GetCoverageStatsDto } from './dto/get-coverage-stats.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

interface AuthenticatedRequest {
  user: { id: number };
}

@Controller('classes')
@UseGuards(AuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // schoolId vem do corpo (CreateClassDto) — TenantGuard exige vínculo
  // aprovado naquela escola, RolesGuard exige perfil de gestão nela.
  @Post()
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  findAll(@Query() params: GetClassDto) {
    return this.classesService.findAll(params);
  }

  // Precisa vir ANTES de "@Get(':id')" — senão o Nest tentaria casar
  // "coverage-stats" como o parâmetro :id da rota abaixo.
  // Fase 4 (COULD) do Design Doc: indicador estatístico simples, sem ML.
  // Sem @Roles: qualquer autenticado consulta; TenantGuard só entra em
  // ação se schoolId for informado (aí exige vínculo aprovado ali, ou MASTER).
  @Get('coverage-stats')
  @UseGuards(TenantGuard)
  getCoverageStats(@Query() params: GetCoverageStatsDto) {
    return this.classesService.getCoverageStats(params);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(+id);
  }

  // Rota por :id — o corpo pode não trazer schoolId (UpdateClassDto o torna
  // opcional), então o RolesGuard aqui só confere perfil de gestão em
  // QUALQUER escola do usuário (checagem grossa); a posse da aula/escola
  // específica é validada dentro do service, que já busca a entidade.
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.classesService.update(+id, updateClassDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.classesService.remove(+id, req.user.id);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.classesService.enroll(+id, req.user.id);
  }

  @Delete(':id/enroll')
  unenroll(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.classesService.unenroll(+id, req.user.id);
  }
}
