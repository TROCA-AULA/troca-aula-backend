import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
          useValue: {
            create: jest.fn(),
            sumActiveHours: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findAll: jest.fn(),
          },
        },
        { provide: SchoolsRepository, useValue: { findOne: jest.fn() } },
        {
          provide: WorkloadPoliciesRepository,
          useValue: { findByNetworkAndType: jest.fn() },
        },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        {
          provide: TenantContextService,
          useValue: { resolve: jest.fn(), hasSchoolAccess: jest.fn() },
        },
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

      const result = await service.create(baseDto, 2);

      // 3h existentes + 5h novas = 8h <= 10h do limite -> não deve lançar
      expect(result).toEqual(expect.objectContaining({ id: 99 }));
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          networkId: 1,
          entityType: 'TeacherWorkloadRecords',
        }),
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

      const result = await service.create(baseDto, 2);

      expect(repository.sumActiveHours).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 100 }));
    });

    it('throws NotFound when the school does not exist', async () => {
      schoolsRepository.findOne.mockResolvedValue(null as any);

      await expect(service.create(baseDto, 2)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not enforce a limit when the policy has no max hours configured', async () => {
      workloadPoliciesRepository.findByNetworkAndType.mockResolvedValue({
        id: 1,
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: null,
      } as any);
      repository.create.mockResolvedValue({ id: 101, ...baseDto } as any);

      const result = await service.create(baseDto, 2);

      expect(repository.sumActiveHours).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 101 }));
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
      tenantContextService.resolve.mockResolvedValue({
        userId: 2,
        isMaster: false,
        subjectId: null,
        links: [],
      });
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
        isMaster: true,
        subjectId: null,
        links: [
          {
            schoolId: 1,
            profileId: 4,
            profileName: ProfileName.MASTER,
            approvedAt: new Date(),
            networkId: null,
          },
        ],
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

  describe('findAll / findOwn', () => {
    it('delegates the management filters to the repository', async () => {
      repository.findAll.mockResolvedValue([{ id: 1 }] as any);

      const result = await service.findAll({ schoolId: 1, userId: 10 });

      expect(repository.findAll).toHaveBeenCalledWith({
        schoolId: 1,
        userId: 10,
      });
      expect(result).toEqual([{ id: 1 }]);
    });

    it('findOwn only looks up the records of the requester', async () => {
      repository.findAll.mockResolvedValue([{ id: 2 }] as any);

      const result = await service.findOwn(10);

      expect(repository.findAll).toHaveBeenCalledWith({ userId: 10 });
      expect(result).toEqual([{ id: 2 }]);
    });
  });

  describe('findOne', () => {
    it('returns the record when found', async () => {
      repository.findOne.mockResolvedValue({ id: 5 } as any);

      await expect(service.findOne(5)).resolves.toEqual({ id: 5 });
    });

    it('throws NotFound when the record does not exist', async () => {
      repository.findOne.mockResolvedValue(null as any);

      await expect(service.findOne(5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = {
      id: 5,
      schoolId: 1,
      networkId: 1,
      userId: 10,
      workloadTypeId: 4,
      hours: '5',
    };

    const managerContext = {
      userId: 2,
      isMaster: false,
      subjectId: null,
      links: [
        {
          schoolId: 1,
          profileId: 1,
          profileName: ProfileName.DIRETOR,
          approvedAt: new Date(),
          networkId: 1,
        },
      ],
    };

    beforeEach(() => {
      repository.findOne.mockResolvedValue(existing as any);
      tenantContextService.resolve.mockResolvedValue(managerContext);
      tenantContextService.hasSchoolAccess.mockReturnValue(true);
      workloadPoliciesRepository.findByNetworkAndType.mockResolvedValue({
        id: 1,
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: '10',
      } as any);
      repository.sumActiveHours.mockResolvedValue(0);
      repository.update.mockResolvedValue({ id: 5, hours: '6' } as any);
    });

    it('updates and audits when the new total stays within the policy', async () => {
      const result = await service.update(
        5,
        { hours: 6, justification: 'ajuste de carga' },
        2,
      );

      expect(repository.update).toHaveBeenCalledWith(5, {
        workloadTypeId: undefined,
        hours: 6,
        ataOficialRef: undefined,
        validFrom: undefined,
        validTo: undefined,
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 5,
          justification: 'ajuste de carga',
        }),
      );
      expect(result).toEqual({ id: 5, hours: '6' });
    });

    it('falls back to the stored type and hours when the dto omits them', async () => {
      await service.update(5, {}, 2);

      expect(
        workloadPoliciesRepository.findByNetworkAndType,
      ).toHaveBeenCalledWith(1, 4);
      expect(repository.sumActiveHours).toHaveBeenCalledWith(1, 10, 4, 5);
      expect(repository.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          workloadTypeId: undefined,
          hours: undefined,
        }),
      );
    });

    it('uses the new workload type when one is provided', async () => {
      await service.update(5, { workloadTypeId: 7 }, 2);

      expect(
        workloadPoliciesRepository.findByNetworkAndType,
      ).toHaveBeenCalledWith(1, 7);
      expect(repository.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ workloadTypeId: 7 }),
      );
    });

    it('rejects updates that would exceed the network policy limit', async () => {
      repository.sumActiveHours.mockResolvedValue(9);

      await expect(service.update(5, { hours: 5 } as any, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('denies updates when the requester has no manager access to the school', async () => {
      tenantContextService.hasSchoolAccess.mockReturnValue(false);

      await expect(service.update(5, { hours: 6 } as any, 2)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFound before any access check when the record does not exist', async () => {
      repository.findOne.mockResolvedValue(null as any);

      await expect(service.update(5, { hours: 6 } as any, 2)).rejects.toThrow(
        NotFoundException,
      );
      expect(tenantContextService.resolve).not.toHaveBeenCalled();
    });
  });
});
