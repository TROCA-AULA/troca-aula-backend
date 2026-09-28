import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassesRepository } from './classes.repository';
import { GetClassDto } from './dto/get-class.dto';
import { GetCoverageStatsDto } from './dto/get-coverage-stats.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { classes, users } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import {
  COVERAGE_RISK_THRESHOLDS,
  CoverageStats,
} from './interfaces/coverage-stats.interface';

@Injectable()
export class ClassesService {
  constructor(
    private readonly repository: ClassesRepository,
    private readonly drizzle: DrizzleService,
    private readonly tenantContextService: TenantContextService,
  ) {}
  create(createClassDto: CreateClassDto) {
    return this.repository.create(createClassDto);
  }

  async findAll(params: GetClassDto) {
    let currentParams = params;
    let professorFilter: {
      subjectId: number | null;
      linkedSchoolIds: Set<number>;
    } | null = null;

    if (params.userId) {
      const tenant = await this.tenantContextService.resolve(params.userId);
      // Gestor não-MASTER (DIRETOR/AUXILIAR_ADMIN) tem QUALQUER vínculo de
      // perfil de gestão - não só olhar tenant.links[0]. Achado real de bug
      // ao validar contra Postgres: um professor recém-criado, ainda SEM
      // NENHUM vínculo aprovado, tinha links=[] -> primaryLink undefined ->
      // a condição antiga não caía nem no ramo "gestor" nem no ramo
      // "professor", e a listagem voltava sem filtro nenhum (professor
      // externo via vaga dentro da janela de prioridade, que é exatamente o
      // que a janela deveria impedir).
      const isNonMasterManager = tenant.links.some((l) =>
        (MANAGER_PROFILES as string[]).includes(l.profileName),
      );

      if (tenant.isMaster) {
        // MASTER enxerga tudo, em qualquer rede/escola (acesso global,
        // Design Doc) - NÃO escopar ao primeiro vínculo dele, mesmo que ele
        // também tenha um vínculo formal em alguma escola (ex.: a escola do
        // bootstrap). Achado real ao validar o guia de simulação: tratar
        // MASTER igual a um gestor comum aqui fazia o próprio dashboard do
        // MASTER (contagem de aulas disponíveis) sumir com aulas de
        // qualquer escola que não fosse a do vínculo dele. currentParams já
        // é `params` (schoolId explícito do chamador, se houver).
      } else if (isNonMasterManager) {
        const primaryLink = tenant.links[0];
        currentParams = {
          schoolId: primaryLink?.schoolId,
          available: params.available,
        };
      } else {
        // Não-gestor (professor com vínculo, ou usuário sem nenhum vínculo
        // ainda): mantém os params originais (não escopa a uma única
        // escola - pode ver vagas de qualquer escola em que tenha vínculo,
        // ou de fora, sujeito ao filtro de matéria/janela abaixo), mas
        // guarda o contexto para filtrar o resultado. linkedSchoolIds fica
        // vazio para quem não tem vínculo nenhum - tratado como "externo"
        // em qualquer escola, corretamente sujeito à janela de prioridade.
        professorFilter = {
          subjectId: tenant.subjectId,
          linkedSchoolIds: new Set(tenant.links.map((l) => l.schoolId)),
        };
      }
    }

    const results = await this.repository.findAll(currentParams);
    if (!professorFilter) {
      return results;
    }

    // Achado real (relatado pelo usuário): a listagem não filtrava por
    // disciplina - o professor via aulas de qualquer matéria e só descobria
    // que não podia se candidatar ao tentar (EnrollmentRequestsService.create
    // já validava subjectId, mas só ali). Filtrando aqui também, a listagem
    // fica coerente com o que o professor realmente pode fazer.
    return results.filter((classItem) => {
      if (
        professorFilter.subjectId !== null &&
        classItem.subjectId !== professorFilter.subjectId
      ) {
        return false;
      }

      // Janela de prioridade da escola (Schools.priorityWindowHours, por
      // escola - não confundir com WorkloadPolicies, que é por rede):
      // enquanto a janela não fechou, só professores vinculados àquela
      // escola veem a vaga. "Vinculado" aqui é qualquer vínculo (aprovado
      // ou não) - um vínculo pendente de aprovação ainda identifica alguém
      // como "da escola" para fins desta regra de visibilidade, que é mais
      // branda que controle de acesso.
      const windowHours = classItem.school?.priorityWindowHours;
      if (
        windowHours &&
        !professorFilter.linkedSchoolIds.has(classItem.schoolId)
      ) {
        const createdAt = classItem.createdAt
          ? new Date(classItem.createdAt).getTime()
          : 0;
        const windowEndsAt = createdAt + windowHours * 60 * 60 * 1000;
        if (Date.now() < windowEndsAt) {
          return false;
        }
      }

      return true;
    });
  }

  findOne(id: number) {
    return this.repository.findOne(id);
  }

  // requesterId é sempre exigido: mesmo com RolesGuard já confirmando que o
  // requisitante tem ALGUM perfil de gestão, só aqui sabemos a que escola
  // ESTA aula pertence — sem essa checagem, um diretor da Escola A poderia
  // editar/remover aulas da Escola B só por não haver schoolId no corpo.
  async update(
    id: number,
    updateClassDto: UpdateClassDto,
    requesterId: number,
  ) {
    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new NotFoundException('Aula não encontrada');
    }

    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        existing.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException('Você só pode alterar aulas da sua escola');
    }

    return this.repository.update(id, updateClassDto);
  }

  async remove(id: number, requesterId: number) {
    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new NotFoundException('Aula não encontrada');
    }

    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        existing.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException('Você só pode remover aulas da sua escola');
    }

    return this.repository.remove(id);
  }

  async enroll(classId: number, userId: number) {
    const [classData] = await this.drizzle.db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), notDeleted(classes)));

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), notDeleted(users)));

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (classData.enrolledById && classData.enrolledById !== userId) {
      throw new BadRequestException(
        'Aula já está inscrita por outro professor',
      );
    }

    if (classData.enrolledById === userId) {
      throw new BadRequestException('Você já está inscrito nesta aula');
    }

    const [updated] = await this.drizzle.db
      .update(classes)
      .set({ enrolledById: userId })
      .where(eq(classes.id, classId))
      .returning();
    return updated;
  }

  async unenroll(classId: number, userId: number) {
    const [classData] = await this.drizzle.db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), notDeleted(classes)));

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (!classData.enrolledById) {
      throw new BadRequestException('Aula não está inscrita por ninguém');
    }

    if (classData.enrolledById !== userId) {
      throw new ForbiddenException(
        'Apenas o professor inscrito pode cancelar inscrição',
      );
    }

    const [updated] = await this.drizzle.db
      .update(classes)
      .set({ enrolledById: null })
      .where(eq(classes.id, classId))
      .returning();
    return updated;
  }

  // Fase 4 (COULD) do Design Doc — indicador estatístico simples (não
  // preditivo): taxa histórica de cobertura de aulas vagas no recorte
  // informado. Cortes de nível documentados em coverage-stats.interface.ts.
  async getCoverageStats(params: GetCoverageStatsDto): Promise<CoverageStats> {
    const { totalVagas, cobertas } =
      await this.repository.getCoverageCounts(params);

    const taxaCobertura = totalVagas > 0 ? cobertas / totalVagas : 0;

    let nivel: CoverageStats['nivel'];
    if (totalVagas === 0) {
      nivel = 'alto'; // sem histórico, trata como risco alto por precaução
    } else if (taxaCobertura >= COVERAGE_RISK_THRESHOLDS.BAIXO_RISCO_MIN) {
      nivel = 'baixo';
    } else if (taxaCobertura >= COVERAGE_RISK_THRESHOLDS.MEDIO_RISCO_MIN) {
      nivel = 'medio';
    } else {
      nivel = 'alto';
    }

    return { totalVagas, cobertas, taxaCobertura, nivel };
  }
}
