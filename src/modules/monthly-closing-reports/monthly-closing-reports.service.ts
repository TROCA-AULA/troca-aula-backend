import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GenerateMonthlyClosingReportDto } from './dto/generate-monthly-closing-report.dto';
import { MonthlyClosingReportsRepository } from './monthly-closing-reports.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

const ENTITY_TYPE = 'MonthlyClosingReports';

@Injectable()
export class MonthlyClosingReportsService {
  constructor(
    private readonly repository: MonthlyClosingReportsRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly auditLogService: AuditLogService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  // Idempotência (estágio Sr. Walter §6.1/§6.2): regerar um relatório ainda
  // em DRAFT é permitido e esperado (novos TeacherWorkloadRecords podem ter
  // sido lançados desde a última geração, antes da gestão revisar). Regerar
  // um relatório já REVIEWED ou CLOSED é bloqueado — nesse ponto a gestão já
  // conferiu os números, e qualquer ajuste posterior precisa passar por um
  // fluxo de correção explícita e rastreada (§6.3), não por sobrescrita
  // silenciosa da geração automática. Esse fluxo de correção não faz parte
  // deste ciclo (fica como pendência documentada).
  async generate(dto: GenerateMonthlyClosingReportDto, requesterId: number) {
    const school = await this.schoolsRepository.findOne(dto.schoolId);
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    const breakdown = await this.repository.aggregateWorkload(
      dto.userId,
      dto.schoolId,
      dto.referenceMonth,
    );

    const existing = await this.repository.findByKey(
      dto.userId,
      dto.schoolId,
      dto.referenceMonth,
    );

    if (existing && existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Já existe um relatório ${existing.status} para este professor/escola/mês — não é possível regerar automaticamente um relatório já conferido pela gestão`,
      );
    }

    const report = existing
      ? await this.repository.updateBreakdown(existing.id, breakdown)
      : await this.repository.create({
          userId: dto.userId,
          schoolId: dto.schoolId,
          referenceMonth: dto.referenceMonth,
          workloadBreakdown: breakdown,
        });

    await this.auditLogService.record({
      networkId: school.networkId,
      entityType: ENTITY_TYPE,
      entityId: report.id,
      changedById: requesterId,
      before: existing ?? null,
      after: report,
      justification: existing ? 'Regeração de rascunho' : 'Geração inicial',
    });

    return report;
  }

  async findOne(id: number) {
    const report = await this.repository.findOne(id);
    if (!report) {
      throw new NotFoundException('Relatório de fechamento não encontrado');
    }
    return report;
  }

  findAll(params: {
    userId?: number;
    schoolId?: number;
    referenceMonth?: string;
  }) {
    return this.repository.findAll(params);
  }

  // Leitura do próprio relatório é liberada a qualquer perfil (professor
  // consultando seu próprio fechamento) — só a listagem "de gestão"
  // (findAll via controller) exige MANAGER_PROFILES.
  async findOneAsOwnerOrManager(id: number, requesterId: number) {
    const report = await this.findOne(id);
    if (report.userId === requesterId) {
      return report;
    }

    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        report.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode ver relatórios de fechamento próprios ou da sua escola',
      );
    }
    return report;
  }

  // DRAFT -> REVIEWED (estágio Sr. Walter §6.2 "Conferência pela Gestão").
  async review(id: number, requesterId: number) {
    const existing = await this.findOne(id);
    await this.assertManagerOfReportSchool(existing.schoolId, requesterId);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Só é possível revisar um relatório em DRAFT (status atual: ${existing.status})`,
      );
    }

    const updated = await this.repository.updateStatus(
      id,
      'REVIEWED',
      requesterId,
    );

    await this.auditLogRecordStatusChange(existing, updated, requesterId);
    return updated;
  }

  // REVIEWED -> CLOSED. Não permite pular direto de DRAFT: a proposta é
  // explícita que a gestão precisa conferir antes de consolidar para a
  // folha de pagamento.
  async close(id: number, requesterId: number) {
    const existing = await this.findOne(id);
    await this.assertManagerOfReportSchool(existing.schoolId, requesterId);
    if (existing.status !== 'REVIEWED') {
      throw new BadRequestException(
        `Só é possível fechar um relatório já REVIEWED (status atual: ${existing.status}) — revise antes de fechar`,
      );
    }

    const updated = await this.repository.updateStatus(id, 'CLOSED');

    await this.auditLogRecordStatusChange(existing, updated, requesterId);
    return updated;
  }

  // REVIEWED/CLOSED -> DRAFT, com justificativa obrigatória (DTO): o §6.3 da
  // proposta pede que ajuste em relatório já conferido passe por um fluxo de
  // correção explícita e rastreado, nunca por sobrescrita silenciosa. Depois
  // de reaberto, `generate()` volta a aceitar regeneração (só DRAFT), e o
  // ciclo review -> close tem que ser refeito.
  async reopen(id: number, justification: string, requesterId: number) {
    const existing = await this.findOne(id);
    await this.assertManagerOfReportSchool(existing.schoolId, requesterId);
    if (existing.status === 'DRAFT') {
      throw new BadRequestException(
        'Este relatório já está em DRAFT — regere/edite diretamente',
      );
    }

    const updated = await this.repository.updateStatus(id, 'DRAFT');

    await this.auditLogRecordStatusChange(
      existing,
      updated,
      requesterId,
      justification,
    );
    return updated;
  }

  // RolesGuard sozinho (sem TenantGuard, já que review/close são só por
  // :id, sem schoolId no corpo) só checa perfil globalmente — o refinamento
  // por escola específica do relatório fica por conta do service, mesmo
  // padrão de TeacherWorkloadRecordsService.update/remove.
  private async assertManagerOfReportSchool(
    schoolId: number,
    requesterId: number,
  ) {
    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode revisar/fechar relatórios de fechamento da sua escola',
      );
    }
  }

  private async auditLogRecordStatusChange(
    before: { schoolId: number; id: number },
    after: unknown,
    requesterId: number,
    justification?: string,
  ) {
    const school = await this.schoolsRepository.findOne(before.schoolId);
    await this.auditLogService.record({
      networkId: school.networkId,
      entityType: ENTITY_TYPE,
      entityId: before.id,
      changedById: requesterId,
      before,
      after,
      ...(justification !== undefined && { justification }),
    });
  }
}
