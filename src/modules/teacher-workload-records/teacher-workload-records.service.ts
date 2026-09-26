import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTeacherWorkloadRecordDto } from './dto/create-teacher-workload-record.dto';
import { UpdateTeacherWorkloadRecordDto } from './dto/update-teacher-workload-record.dto';
import { TeacherWorkloadRecordsRepository } from './teacher-workload-records.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { WorkloadPoliciesRepository } from '../workload-policies/workload-policies.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

const ENTITY_TYPE = 'TeacherWorkloadRecords';

@Injectable()
export class TeacherWorkloadRecordsService {
  constructor(
    private readonly repository: TeacherWorkloadRecordsRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly workloadPoliciesRepository: WorkloadPoliciesRepository,
    private readonly auditLogService: AuditLogService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  // Regra central da proposta de complementação da gestão escolar (estágio
  // Sr. Walter §1.2 "Limite de Carga Horária"): antes de gravar, soma as
  // horas já vigentes do mesmo tipo para aquele professor/escola e rejeita
  // se ultrapassar o `maxHoursPerWeek` configurado pela REDE — quando não
  // há política configurada para o tipo, não há limite a aplicar (rede
  // ainda não parametrizou aquela categoria).
  private async assertWithinPolicy(
    networkId: number,
    schoolId: number,
    userId: number,
    workloadTypeId: number,
    newHours: number,
    excludeId?: number,
  ) {
    const policy = await this.workloadPoliciesRepository.findByNetworkAndType(
      networkId,
      workloadTypeId,
    );
    if (!policy || policy.maxHoursPerWeek === null) {
      return;
    }

    const existingHours = await this.repository.sumActiveHours(
      schoolId,
      userId,
      workloadTypeId,
      excludeId,
    );
    const total = existingHours + newHours;
    const max = Number(policy.maxHoursPerWeek);
    if (total > max) {
      throw new BadRequestException(
        `Limite de carga horária excedido para este tipo: ${total}h somadas, limite da rede é ${max}h/semana`,
      );
    }
  }

  async create(dto: CreateTeacherWorkloadRecordDto, requesterId: number) {
    const school = await this.schoolsRepository.findOne(dto.schoolId);
    if (!school) {
      throw new NotFoundException('Escola não encontrada');
    }

    await this.assertWithinPolicy(
      school.networkId,
      dto.schoolId,
      dto.userId,
      dto.workloadTypeId,
      dto.hours,
    );

    const record = await this.repository.create({
      userId: dto.userId,
      schoolId: dto.schoolId,
      networkId: school.networkId,
      workloadTypeId: dto.workloadTypeId,
      hours: dto.hours,
      ataOficialRef: dto.ataOficialRef,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      createdById: requesterId,
    });

    await this.auditLogService.record({
      networkId: school.networkId,
      entityType: ENTITY_TYPE,
      entityId: record.id,
      changedById: requesterId,
      before: null,
      after: record,
      justification: dto.justification,
    });

    return record;
  }

  findAll(params: { schoolId?: number; userId?: number }) {
    return this.repository.findAll(params);
  }

  findOwn(userId: number) {
    return this.repository.findAll({ userId });
  }

  async findOne(id: number) {
    const record = await this.repository.findOne(id);
    if (!record) {
      throw new NotFoundException('Registro de carga horária não encontrado');
    }
    return record;
  }

  async update(
    id: number,
    dto: UpdateTeacherWorkloadRecordDto,
    requesterId: number,
  ) {
    const existing = await this.findOne(id);

    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        existing.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode alterar registros de carga horária da sua escola',
      );
    }

    const workloadTypeId = dto.workloadTypeId ?? existing.workloadTypeId;
    const hours = dto.hours ?? Number(existing.hours);
    await this.assertWithinPolicy(
      existing.networkId,
      existing.schoolId,
      existing.userId,
      workloadTypeId,
      hours,
      id,
    );

    const updated = await this.repository.update(id, {
      workloadTypeId: dto.workloadTypeId,
      hours: dto.hours,
      ataOficialRef: dto.ataOficialRef,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
    });

    await this.auditLogService.record({
      networkId: existing.networkId,
      entityType: ENTITY_TYPE,
      entityId: id,
      changedById: requesterId,
      before: existing,
      after: updated,
      justification: dto.justification,
    });

    return updated;
  }

  async remove(id: number, requesterId: number) {
    const existing = await this.findOne(id);

    const tenant = await this.tenantContextService.resolve(requesterId);
    if (
      !this.tenantContextService.hasSchoolAccess(
        tenant,
        existing.schoolId,
        MANAGER_PROFILES,
      )
    ) {
      throw new ForbiddenException(
        'Você só pode remover registros de carga horária da sua escola',
      );
    }

    const removed = await this.repository.remove(id);

    await this.auditLogService.record({
      networkId: existing.networkId,
      entityType: ENTITY_TYPE,
      entityId: id,
      changedById: requesterId,
      before: existing,
      after: null,
    });

    return removed;
  }
}
