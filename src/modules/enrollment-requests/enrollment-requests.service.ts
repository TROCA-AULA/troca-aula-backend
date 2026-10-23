import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, gt, isNull, lt, ne } from 'drizzle-orm';
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

    // Defeito D11: dava para se candidatar a aula que já aconteceu.
    if (classData.statededAt && new Date(classData.statededAt) < new Date()) {
      throw new BadRequestException('Esta aula já aconteceu');
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

    const hasConflict = await this.checkConflict(professorId, classData);

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

  // Conflito = o professor já está com OUTRA aula (aprovada para ele) que
  // se sobrepõe no horário REAL (data + hora). Antes comparava só "dia da
  // semana + hora" e nunca disparava, porque a criação não gravava esses
  // campos (D7); comparar por dia da semana também travaria para sempre
  // toda quinta-feira depois de uma única aula numa quinta.
  private async checkConflict(
    professorId: number,
    target: {
      id: number;
      statededAt: Date | null;
      finishedAt: Date | null;
    },
  ): Promise<boolean> {
    if (!target.statededAt || !target.finishedAt) {
      return false;
    }

    const overlapping = await this.drizzle.db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(
          eq(classes.enrolledById, professorId),
          ne(classes.id, target.id),
          lt(classes.statededAt, target.finishedAt),
          gt(classes.finishedAt, target.statededAt),
          notDeleted(classes),
        ),
      )
      .limit(1);

    return overlapping.length > 0;
  }

  async findAll(params: FilterEnrollmentRequestDto, userId: number) {
    const tenant = await this.tenantContextService.resolve(userId);
    const isManager = this.tenantContextService.hasAnyRole(
      tenant,
      MANAGER_PROFILES,
    );
    const managedSchoolIds = [
      ...new Set(
        tenant.links
          .filter((l) => (MANAGER_PROFILES as string[]).includes(l.profileName))
          .map((l) => l.schoolId),
      ),
    ];

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
    } else if (!tenant.isMaster) {
      // Gestor: a escola pedida (se ele gerencia) ou todas que gerencia —
      // antes usava só o primeiro vínculo (quebrava quem tem várias).
      if (!params.schoolId || !managedSchoolIds.includes(params.schoolId)) {
        delete filters.schoolId;
        filters.schoolIds = managedSchoolIds;
      }
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
    //
    // Defeito D3: a aula só é ocupada se AINDA estiver livre — a condição
    // vai no próprio UPDATE (available = true e sem ocupante), então duas
    // aprovações simultâneas não passam juntas: a segunda não acha linha
    // para atualizar e a transação inteira volta atrás. Mesma ideia para a
    // candidatura (só sai de PENDING uma vez).
    const [updated] = await this.drizzle.db.transaction(async (tx) => {
      const taken = await tx
        .update(classes)
        .set({ enrolledById: request.professorId, available: false })
        .where(
          and(
            eq(classes.id, request.classId),
            eq(classes.available, true),
            isNull(classes.enrolledById),
          ),
        )
        .returning({ id: classes.id });
      if (taken.length === 0) {
        throw new BadRequestException(
          'Esta aula já foi preenchida por outra candidatura aprovada',
        );
      }

      const approved = await tx
        .update(enrollmentRequest)
        .set({ status: 'APPROVED', updatedAt: new Date() })
        .where(
          and(
            eq(enrollmentRequest.id, id),
            eq(enrollmentRequest.status, 'PENDING'),
          ),
        )
        .returning();
      if (approved.length === 0) {
        throw new BadRequestException('Solicitação não está pendente');
      }
      return approved;
    });

    await this.notifyProfessor(
      request.professorId,
      'Candidatura aprovada',
      'Sua candidatura foi aprovada pela direção. Confira os detalhes em Minhas Aulas.',
    );

    return updated;
  }

  async reject(id: number, directorId: number, rejectionReason?: string) {
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

    const reason = rejectionReason?.trim() || null;
    const updated = await this.repository.update(id, {
      status: 'REJECTED',
      rejectionReason: reason,
    });

    await this.notifyProfessor(
      request.professorId,
      'Candidatura rejeitada',
      reason
        ? `Sua candidatura foi rejeitada pela direção. Motivo: ${reason}`
        : 'Sua candidatura foi rejeitada pela direção. Confira os detalhes em Minhas Aulas.',
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
