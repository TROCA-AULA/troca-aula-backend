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

  // Bug real encontrado ao validar o guia de simulação contra Postgres de
  // verdade: `userId` era um campo opcional que o CLIENTE decidia mandar ou
  // não na query string. A tela real de "Aulas Disponíveis" (`/classes`,
  // via `enrollmentService.getAvailableClasses`) nunca mandava esse
  // parâmetro — só uma tela legada/duplicada (`dashboard/page.tsx`)
  // mandava. Resultado: o filtro de matéria e a janela de prioridade da
  // escola (`ClassesService.findAll`) nunca eram aplicados na tela que os
  // professores realmente usam — um professor externo via e (pela
  // listagem) parecia poder se candidatar a qualquer vaga durante a janela
  // de prioridade, mesmo a candidatura sendo rejeitada com 403 na hora de
  // confirmar (defesa em profundidade que já existia e continua intacta em
  // `EnrollmentRequestsService.create`). Corrigido: `userId` agora sempre
  // vem do token (`req.user.id`), nunca do cliente — não dá mais pra
  // omitir nem falsificar.
  @Get()
  findAll(@Query() params: GetClassDto, @Request() req: AuthenticatedRequest) {
    return this.classesService.findAll({ ...params, userId: req.user.id });
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
