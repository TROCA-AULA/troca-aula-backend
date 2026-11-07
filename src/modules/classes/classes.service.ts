import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassesRepository } from './classes.repository';
import { GetClassDto } from './dto/get-class.dto';
import { GetCoverageStatsDto } from './dto/get-coverage-stats.dto';
import { DrizzleService } from '../../database/drizzle.service';
import { schools, users, usersProfilesSchools } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { EligibilityService } from '../eligibility/eligibility.service';
import { EmailService } from '../email/email.service';
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
    private readonly eligibilityService: EligibilityService,
    private readonly emailService: EmailService,
  ) {}
  async create(createClassDto: CreateClassDto) {
    const created = await this.repository.create(createClassDto);
    await this.notifyEligibleProfessors(created);
    return created;
  }

  // Notificação de nova vaga (roadmap): professores da mesma matéria com
  // vínculo APROVADO na escola da aula. E-mail é extra — EmailService é
  // no-op sem SMTP e nunca lança.
  private async notifyEligibleProfessors(classData: {
    id: number;
    schoolId: number;
    subjectId: number;
  }): Promise<void> {
    const professors = await this.drizzle.db.query.users.findMany({
      where: and(eq(users.subjectId, classData.subjectId), notDeleted(users)),
      columns: { id: true, name: true, email: true },
      with: {
        upsUser: {
          where: and(
            eq(usersProfilesSchools.schoolId, classData.schoolId),
            isNotNull(usersProfilesSchools.approvedAt),
          ),
          columns: { schoolId: true },
        },
      },
    });

    const recipients = professors.filter(
      (professor) => (professor.upsUser ?? []).length > 0,
    );
    if (recipients.length === 0) return;

    await this.emailService.sendMany(
      recipients.map((professor) => ({
        to: professor.email,
        subject: 'Nova aula vaga na sua escola',
        text: `Olá, ${professor.name}. Uma nova aula vaga da sua matéria foi publicada na sua escola. Acesse o Troca Aula para ver os detalhes.`,
      })),
    );
  }

  async findAll(params: GetClassDto) {
    let currentParams: GetClassDto & { schoolIds?: number[] } = params;
    let professorFilter: {
      professorId: number;
      subjectId: number | null;
    } | null = null;

    if (params.userId) {
      const tenant = await this.tenantContextService.resolve(params.userId);
      // Gestor não-MASTER (DIRETOR/AUXILIAR_ADMIN/COORDENADOR) tem QUALQUER
      // vínculo de perfil de gestão. Achado real de bug ao validar contra
      // Postgres: um professor recém-criado, ainda SEM NENHUM vínculo
      // aprovado, tinha links=[] e a listagem voltava sem filtro nenhum.
      const managedSchoolIds = [
        ...new Set(
          tenant.links
            .filter((l) =>
              (MANAGER_PROFILES as string[]).includes(l.profileName),
            )
            .map((l) => l.schoolId),
        ),
      ];

      if (tenant.isMaster) {
        // MASTER enxerga tudo, em qualquer rede/escola (acesso global,
        // Design Doc) — currentParams já é `params` (schoolId explícito do
        // chamador, se houver).
      } else if (managedSchoolIds.length > 0) {
        // Gestor: a escola pedida (se ele gerencia) ou todas as que ele
        // gerencia — antes usava só o "primeiro vínculo", o que quebrava
        // quem gerencia mais de uma escola (ex.: coordenador municipal).
        currentParams = {
          available: params.available,
          schoolIds:
            params.schoolId && managedSchoolIds.includes(params.schoolId)
              ? [params.schoolId]
              : managedSchoolIds,
        };
      } else {
        // Não-gestor (professor com vínculo, ou usuário sem nenhum vínculo
        // ainda): pode ver vagas de qualquer escola, sujeito à
        // elegibilidade abaixo.
        professorFilter = {
          professorId: params.userId,
          subjectId: tenant.subjectId,
        };
      }
    }

    const results = await this.repository.findAll(currentParams);
    if (!professorFilter) {
      return results;
    }

    // Professor só vê aulas da própria matéria (a candidatura já exigia
    // isso) e que ainda não aconteceram (defeito D11). Sem disciplina
    // cadastrada não há o que mostrar.
    const now = Date.now();
    const subjectFiltered = results.filter(
      (classItem) =>
        professorFilter.subjectId !== null &&
        classItem.subjectId === professorFilter.subjectId &&
        (!classItem.statededAt ||
          new Date(classItem.statededAt).getTime() >= now ||
          classItem.enrolledById === professorFilter.professorId),
    );

    // Fase 5 (Design Doc, Seção 9): visibilidade decidida pelo mesmo motor
    // usado na candidatura, em lote para não fazer N queries por aula.
    const verdicts = await this.eligibilityService.evaluateMany(
      professorFilter.professorId,
      subjectFiltered.map((classItem) => ({
        schoolId: classItem.schoolId,
        createdAt: classItem.createdAt,
      })),
    );
    const visible = subjectFiltered.filter(
      (_, index) => verdicts[index].visible,
    );

    return this.fillSchoolNames(visible);
  }

  // Vaga de escola de OUTRO município (liberada pela interconexão): o RLS
  // esconde a escola e a coluna "Escola" aparecia em branco (D4). Completa
  // só id, nome e rede, em leitura privilegiada.
  private async fillSchoolNames<
    T extends { schoolId: number; school?: unknown },
  >(items: T[]): Promise<T[]> {
    const missing = [
      ...new Set(items.filter((i) => !i.school).map((i) => i.schoolId)),
    ];
    if (missing.length === 0) return items;

    const rows = await this.drizzle.runPrivileged(() =>
      this.drizzle.db.query.schools.findMany({
        where: inArray(schools.id, missing),
        columns: { id: true, name: true, networkId: true },
      }),
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    return items.map((item) =>
      item.school ? item : { ...item, school: byId.get(item.schoolId) ?? null },
    );
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
