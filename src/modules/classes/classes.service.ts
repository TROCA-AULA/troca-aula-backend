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
import { MANAGER_PROFILES, ProfileName } from '../auth/tenant/tenant-context';
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
    if (params.userId) {
      const tenant = await this.tenantContextService.resolve(params.userId);
      const primaryLink = tenant.links[0];
      if (primaryLink && primaryLink.profileName !== ProfileName.PROFESSOR) {
        currentParams = {
          schoolId: primaryLink.schoolId,
          available: params.available,
        };
      }
    }
    return this.repository.findAll(currentParams);
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
  async getCoverageStats(
    params: GetCoverageStatsDto,
  ): Promise<CoverageStats> {
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
