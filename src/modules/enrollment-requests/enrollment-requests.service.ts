import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { classes, enrollmentRequest } from '../../database/schema';
import { notDeleted } from '../../database/soft-delete';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { FilterEnrollmentRequestDto } from './dto/filter-enrollment-request.dto';
import { ClassesRepository } from '../classes/classes.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { EligibilityService } from '../eligibility/eligibility.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class EnrollmentRequestsService {
  constructor(
    private readonly repository: EnrollmentRequestsRepository,
    private readonly userRepository: UsersRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly drizzle: DrizzleService,
    private readonly tenantContextService: TenantContextService,
    private readonly eligibilityService: EligibilityService,
    private readonly emailService: EmailService,
  ) {}

  async create(classId: number, professorId: number) {
    const classData = await this.classesRepository.findOne(classId);
    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (!classData.available) {
      throw new BadRequestException('Aula não está disponível');
    }

    const existingRequests = await this.repository.findAll({
      classId,
      professorId,
      status: 'PENDING',
    });

    if (existingRequests.length > 0) {
      throw new BadRequestException('Já existe uma solicitação pendente');
    }

    const professor = await this.userRepository.findOne(professorId);
    if (!professor) {
      throw new NotFoundException('Professor não encontrado');
    }

    if (professor.subjectId !== classData.subjectId) {
      throw new ForbiddenException(
        'Você só pode se candidatar a aulas da sua matéria',
      );
    }

    // Fase 5 (Design Doc, Seção 9): defesa em profundidade - a listagem
    // (ClassesService.findAll) já usa o mesmo motor, mas isso não impede
    // alguém de tentar se candidatar direto pelo classId. Inclui a
    // mensagem específica quando o bloqueio é uma exclusão do próprio
    // professor (Seção 9.3: "só afeta vaga nova", com aviso de como
    // desfazer).
    await this.eligibilityService.assertCanApply(professorId, {
      schoolId: classData.schoolId,
      createdAt: classData.createdAt,
    });

    const hasConflict = await this.checkConflict(
      professorId,
      classData.dayOfWeek,
      classData.startTime,
      classData.endTime,
    );

    if (hasConflict) {
      throw new BadRequestException('Conflito de horário detectado');
    }

    if (
      professor.substitutionLimitPerSemester !== null &&
      professor.substitutionLimitPerSemester !== undefined &&
      professor.substitutionLimitPerSemester > 0
    ) {
      const approvedCount = await this.countApprovedSubstitutions(professorId);
      if (approvedCount >= professor.substitutionLimitPerSemester) {
        throw new BadRequestException(
          `Limite de substituições atingido para este semestre (${professor.substitutionLimitPerSemester} limite)`,
        );
      }
    }

    return this.repository.create({
      classId,
      professorId,
      status: 'PENDING',
    });
  }

  // Corrige bug real (P14, problemas-conhecidos.md do frontend): a mensagem
  // de erro sempre disse "para este semestre", mas a contagem nunca teve
  // recorte de semestre — contava a carreira inteira do professor. Servidor
  // é a fonte de verdade da data "agora" (nunca o relógio do cliente).
  private getCurrentSemesterStart(): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const semesterStartMonth = now.getUTCMonth() < 6 ? 0 : 6; // jan ou jul
    return new Date(Date.UTC(year, semesterStartMonth, 1));
  }

  private countApprovedSubstitutions(professorId: number): Promise<number> {
    return this.repository.count({
      professorId,
      status: 'APPROVED',
      createdAtGte: this.getCurrentSemesterStart(),
    });
  }

  // Fonte única do "quanto falta pro limite" — usada pelo frontend
  // (useSubstitutionLimit) em vez de recalcular semestre/contagem no
  // cliente. Professor só vê o próprio status; gestor (DIRETOR/
  // AUXILIAR_ADMIN/MASTER) pode consultar o de qualquer professor.
  async getSubstitutionLimitStatus(professorId: number, requesterId: number) {
    if (requesterId !== professorId) {
      const tenant = await this.tenantContextService.resolve(requesterId);
      const isManager = this.tenantContextService.hasAnyRole(
        tenant,
        MANAGER_PROFILES,
      );
      if (!isManager) {
        throw new ForbiddenException(
          'Sem permissão para ver o limite de outro professor',
        );
      }
    }

    const professor = await this.userRepository.findOne(professorId);
    if (!professor) {
      throw new NotFoundException('Professor não encontrado');
    }

    const limit = professor.substitutionLimitPerSemester ?? null;
    const current =
      limit !== null && limit > 0
        ? await this.countApprovedSubstitutions(professorId)
        : 0;
    const percentage =
      limit && limit > 0 ? Math.round((current / limit) * 100) : 0;
    const canApply = limit === null || limit <= 0 || current < limit;

    return { current, limit, percentage, canApply };
  }

  private async checkConflict(
    professorId: number,
    dayOfWeek: number | null,
    startTime: string | null,
    endTime: string | null,
  ): Promise<boolean> {
    if (!dayOfWeek || !startTime || !endTime) {
      return false;
    }

    const professorClasses = await this.drizzle.db
      .select()
      .from(classes)
      .where(
        and(
          or(
            eq(classes.enrolledById, professorId),
            eq(classes.createdByd, professorId),
          ),
          eq(classes.dayOfWeek, dayOfWeek),
          notDeleted(classes),
        ),
      );

    for (const cls of professorClasses) {
      if (cls.startTime && cls.endTime) {
        if (this.timesOverlap(startTime, endTime, cls.startTime, cls.endTime)) {
          return true;
        }
      }
    }

    return false;
  }

  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  async findAll(params: FilterEnrollmentRequestDto, userId: number) {
    const tenant = await this.tenantContextService.resolve(userId);
    const isManager = this.tenantContextService.hasAnyRole(
      tenant,
      MANAGER_PROFILES,
    );
    const managerSchoolId = tenant.links[0]?.schoolId;

    const filters: Parameters<EnrollmentRequestsRepository['findAll']>[0] = {};

    if (params.status) filters.status = params.status;
    if (params.classId) filters.classId = params.classId;
    if (params.professorId) filters.professorId = params.professorId;
    if (params.userId) filters.professorId = params.userId;

    if (params.createdAfter) {
      filters.createdAtGte = new Date(params.createdAfter);
    }
    if (params.createdBefore) {
      filters.createdAtLte = new Date(params.createdBefore);
    }
    if (params.mes) {
      const start = new Date(`${params.mes}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      filters.createdAtGte = start;
      filters.createdAtLt = end;
    }

    if (params.schoolId) {
      filters.schoolId = params.schoolId;
    }

    if (!isManager) {
      filters.professorId = userId;
    } else if (!tenant.isMaster && managerSchoolId) {
      filters.schoolId = managerSchoolId;
    }

    return this.repository.findAll(filters);
  }

  async findOne(id: number) {
    const request = await this.repository.findOne(id);
    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    return request;
  }

  async approve(id: number, directorId: number) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solicitação não está pendente');
    }

    const [classData] = await this.drizzle.db
      .select()
      .from(classes)
      .where(eq(classes.id, request.classId));

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const tenant = await this.tenantContextService.resolve(directorId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        classData.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode aprovar solicitações de aulas da sua escola',
      );
    }

    // As duas escritas abaixo (liberar a aula + marcar a candidatura como
    // aprovada) precisam ser atômicas: antes da migração para Drizzle isso
    // era feito com duas chamadas Prisma sequenciais SEM `$transaction`
    // explícito (ver achado da auditoria em docs/design-doc-evolucao-multi-tenant.md,
    // ADR-002) — uma falha entre as duas deixava a aula "ocupada" sem
    // nenhuma candidatura de fato aprovada. Agora ambas rodam dentro da
    // mesma transação: ou as duas persistem, ou nenhuma.
    const [updated] = await this.drizzle.db.transaction(async (tx) => {
      await tx
        .update(classes)
        .set({ enrolledById: request.professorId, available: false })
        .where(eq(classes.id, request.classId));

      return tx
        .update(enrollmentRequest)
        .set({ status: 'APPROVED', updatedAt: new Date() })
        .where(eq(enrollmentRequest.id, id))
        .returning();
    });

    await this.notifyProfessor(
      request.professorId,
      'Candidatura aprovada',
      'Sua candidatura foi aprovada pela direção. Confira os detalhes em Minhas Aulas.',
    );

    return updated;
  }

  async reject(id: number, directorId: number) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solicitação não está pendente');
    }

    const [classData] = await this.drizzle.db
      .select()
      .from(classes)
      .where(eq(classes.id, request.classId));

    if (!classData) {
      throw new NotFoundException('Aula não encontrada');
    }

    const tenant = await this.tenantContextService.resolve(directorId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        classData.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode rejeitar solicitações de aulas da sua escola',
      );
    }

    const updated = await this.repository.update(id, { status: 'REJECTED' });

    await this.notifyProfessor(
      request.professorId,
      'Candidatura rejeitada',
      'Sua candidatura foi rejeitada pela direção. Confira os detalhes em Minhas Aulas.',
    );

    return updated;
  }

  async cancel(id: number, professorId: number) {
    const request = await this.findOne(id);

    if (request.professorId !== professorId) {
      throw new ForbiddenException('Apenas o professor pode cancelar');
    }

    if (request.status === 'APPROVED') {
      const [classData] = await this.drizzle.db
        .select()
        .from(classes)
        .where(eq(classes.id, request.classId));

      if (classData && classData.enrolledById === professorId) {
        // Mesmo raciocínio de atomicidade do approve(): liberar a aula e
        // marcar a candidatura como cancelada precisam acontecer juntos.
        const [updated] = await this.drizzle.db.transaction(async (tx) => {
          await tx
            .update(classes)
            .set({ enrolledById: null, available: true })
            .where(eq(classes.id, request.classId));

          return tx
            .update(enrollmentRequest)
            .set({ status: 'CANCELLED', updatedAt: new Date() })
            .where(eq(enrollmentRequest.id, id))
            .returning();
        });
        return updated;
      }
    }

    return this.repository.update(id, { status: 'CANCELLED' });
  }

  // Notificação por e-mail é um extra: EmailService nunca lança (no-op sem
  // SMTP configurado), então pode ser aguardada sem risco para a operação.
  private async notifyProfessor(
    professorId: number,
    subject: string,
    text: string,
  ): Promise<void> {
    const professor = await this.userRepository.findOne(professorId);
    if (!professor?.email) return;
    await this.emailService.send({ to: professor.email, subject, text });
  }
}
