import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TeacherWorkloadRecordsService } from './teacher-workload-records.service';
import { TeacherWorkloadRecordsRepository } from './teacher-workload-records.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { WorkloadPoliciesRepository } from '../workload-policies/workload-policies.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { ProfileName } from '../auth/tenant/tenant-context';

describe('TeacherWorkloadRecordsService', () => {
  let service: TeacherWorkloadRecordsService;
  let repository: jest.Mocked<TeacherWorkloadRecordsRepository>;
  let schoolsRepository: jest.Mocked<SchoolsRepository>;
  let workloadPoliciesRepository: jest.Mocked<WorkloadPoliciesRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const baseDto = {
    userId: 10,
    schoolId: 1,
    workloadTypeId: 4, // SUPLEMENTAR
    hours: 5,
    validFrom: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherWorkloadRecordsService,
        {
          provide: TeacherWorkloadRecordsRepository,
          useValue: { create: jest.fn(), sumActiveHours: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn(), findAll: jest.fn() },
        },
        { provide: SchoolsRepository, useValue: { findOne: jest.fn() } },
        {
          provide: WorkloadPoliciesRepository,
          useValue: { findByNetworkAndType: jest.fn() },
        },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        { provide: TenantContextService, useValue: { resolve: jest.fn(), hasSchoolAccess: jest.fn() } },
      ],
    }).compile();

    service = module.get(TeacherWorkloadRecordsService);
    repository = module.get(TeacherWorkloadRecordsRepository);
    schoolsRepository = module.get(SchoolsRepository);
    workloadPoliciesRepository = module.get(WorkloadPoliciesRepository);
    auditLogService = module.get(AuditLogService);
    tenantContextService = module.get(TenantContextService);

    schoolsRepository.findOne.mockResolvedValue({ id: 1, networkId: 1 } as any);
  });

  describe('create', () => {
    it('creates the record when total hours stay within the network policy limit', async () => {
      workloadPoliciesRepository.findByNetworkAndType.mockResolvedValue({
        id: 1,
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: '10',
      } as any);
      repository.sumActiveHours.mockResolvedValue(3); // já tem 3h vigentes
      repository.create.mockResolvedValue({ id: 99, ...baseDto } as any);

      const result = await service.create(baseDto as any, 2);

      // 3h existentes + 5h novas = 8h <= 10h do limite -> não deve lançar
      expect(result).toEqual(expect.objectContaining({ id: 99 }));
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ networkId: 1, entityType: 'TeacherWorkloadRecords' }),
      );
    });

    it('rejects when total hours would exceed the network policy limit', async () => {
      workloadPoliciesRepository.findByNetworkAndType.mockResolvedValue({
        id: 1,
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: '10',
      } as any);
      repository.sumActiveHours.mockResolvedValue(8); // já tem 8h vigentes

      // 8h existentes + 5h novas = 13h > 10h do limite -> deve rejeitar
      await expect(service.create(baseDto as any, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not enforce a limit when the network has no policy for the type', async () => {
      workloadPoliciesRepository.findByNetworkAndType.mockResolvedValue(
        null as any,
      );
      repository.create.mockResolvedValue({ id: 100, ...baseDto } as any);

      const result = await service.create(baseDto as any, 2);

      expect(repository.sumActiveHours).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 100 }));
    });
  });

  describe('remove', () => {
    it('denies removal when the requester has no manager access to the record school', async () => {
      repository.findOne.mockResolvedValue({
        id: 5,
        schoolId: 1,
        networkId: 1,
        userId: 10,
        workloadTypeId: 4,
        hours: '5',
      } as any);
      tenantContextService.resolve.mockResolvedValue({ userId: 2, isMaster: false, subjectId: null, links: [] });
      tenantContextService.hasSchoolAccess.mockReturnValue(false);

      await expect(service.remove(5, 2)).rejects.toThrow(ForbiddenException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('removes and logs when the requester is MASTER', async () => {
      repository.findOne.mockResolvedValue({
        id: 5,
        schoolId: 1,
        networkId: 1,
        userId: 10,
        workloadTypeId: 4,
        hours: '5',
      } as any);
      tenantContextService.resolve.mockResolvedValue({
        userId: 2,
        isMaster: true, subjectId: null,
        links: [{ schoolId: 1, profileId: 4, profileName: ProfileName.MASTER, approvedAt: new Date() }],
      });
      tenantContextService.hasSchoolAccess.mockReturnValue(true);
      repository.remove.mockResolvedValue({ id: 5 } as any);

      const result = await service.remove(5, 2);

      expect(result).toEqual({ id: 5 });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 5, after: null }),
      );
    });
  });
});
