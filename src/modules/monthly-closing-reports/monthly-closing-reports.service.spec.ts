import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MonthlyClosingReportsService } from './monthly-closing-reports.service';
import { MonthlyClosingReportsRepository } from './monthly-closing-reports.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { ProfileName } from '../auth/tenant/tenant-context';

describe('MonthlyClosingReportsService', () => {
  let service: MonthlyClosingReportsService;
  let repository: jest.Mocked<MonthlyClosingReportsRepository>;
  let schoolsRepository: jest.Mocked<SchoolsRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const baseDto = { userId: 10, schoolId: 1, referenceMonth: '2026-03' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyClosingReportsService,
        {
          provide: MonthlyClosingReportsRepository,
          useValue: {
            findByKey: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
            aggregateWorkload: jest.fn(),
            create: jest.fn(),
            updateBreakdown: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        { provide: SchoolsRepository, useValue: { findOne: jest.fn() } },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        {
          provide: TenantContextService,
          useValue: { resolve: jest.fn(), hasSchoolAccess: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MonthlyClosingReportsService);
    repository = module.get(MonthlyClosingReportsRepository);
    schoolsRepository = module.get(SchoolsRepository);
    auditLogService = module.get(AuditLogService);
    tenantContextService = module.get(TenantContextService);

    schoolsRepository.findOne.mockResolvedValue({ id: 1, networkId: 1 } as any);
  });

  describe('generate', () => {
    it('creates a new DRAFT report from the aggregated workload when none exists yet', async () => {
      repository.aggregateWorkload.mockResolvedValue({ AULA: 20, SUPLEMENTAR: 6, total: 26 });
      repository.findByKey.mockResolvedValue(undefined);
      repository.create.mockResolvedValue({
        id: 1,
        ...baseDto,
        status: 'DRAFT',
        workloadBreakdown: { AULA: 20, SUPLEMENTAR: 6, total: 26 },
      } as any);

      const result = await service.generate(baseDto as any, 2);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ workloadBreakdown: { AULA: 20, SUPLEMENTAR: 6, total: 26 } }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 1, status: 'DRAFT' }));
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ networkId: 1, entityType: 'MonthlyClosingReports' }),
      );
    });

    it('regenerates (overwrites) an existing DRAFT report', async () => {
      repository.aggregateWorkload.mockResolvedValue({ AULA: 24, total: 24 });
      repository.findByKey.mockResolvedValue({ id: 1, ...baseDto, status: 'DRAFT' } as any);
      repository.updateBreakdown.mockResolvedValue({
        id: 1,
        ...baseDto,
        status: 'DRAFT',
        workloadBreakdown: { AULA: 24, total: 24 },
      } as any);

      const result = await service.generate(baseDto as any, 2);

      expect(repository.updateBreakdown).toHaveBeenCalledWith(1, { AULA: 24, total: 24 });
      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it('rejects regenerating a report that is already REVIEWED or CLOSED', async () => {
      repository.aggregateWorkload.mockResolvedValue({ total: 0 });
      repository.findByKey.mockResolvedValue({ id: 1, ...baseDto, status: 'CLOSED' } as any);

      await expect(service.generate(baseDto as any, 2)).rejects.toThrow(BadRequestException);
      expect(repository.updateBreakdown).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('review/close transitions', () => {
    const managerContext = {
      userId: 2,
      isMaster: false, subjectId: null,
      links: [{ schoolId: 1, profileId: 1, profileName: ProfileName.DIRETOR, approvedAt: new Date(), networkId: null }],
    };

    it('moves a DRAFT report to REVIEWED when the requester manages the school', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'DRAFT' } as any);
      tenantContextService.resolve.mockResolvedValue(managerContext);
      tenantContextService.hasSchoolAccess.mockReturnValue(true);
      repository.updateStatus.mockResolvedValue({ id: 1, ...baseDto, status: 'REVIEWED' } as any);

      const result = await service.review(1, 2);

      expect(repository.updateStatus).toHaveBeenCalledWith(1, 'REVIEWED', 2);
      expect(result).toEqual(expect.objectContaining({ status: 'REVIEWED' }));
    });

    it('rejects reviewing a report that is not DRAFT', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'REVIEWED' } as any);
      tenantContextService.resolve.mockResolvedValue(managerContext);
      tenantContextService.hasSchoolAccess.mockReturnValue(true);

      await expect(service.review(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('denies review when the requester does not manage the report school', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'DRAFT' } as any);
      tenantContextService.resolve.mockResolvedValue({ userId: 2, isMaster: false, subjectId: null, links: [] });
      tenantContextService.hasSchoolAccess.mockReturnValue(false);

      await expect(service.review(1, 2)).rejects.toThrow(ForbiddenException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects closing a report that skips REVIEWED (still DRAFT)', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'DRAFT' } as any);
      tenantContextService.resolve.mockResolvedValue(managerContext);
      tenantContextService.hasSchoolAccess.mockReturnValue(true);

      await expect(service.close(1, 2)).rejects.toThrow(BadRequestException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('moves a REVIEWED report to CLOSED when the requester manages the school', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'REVIEWED' } as any);
      tenantContextService.resolve.mockResolvedValue(managerContext);
      tenantContextService.hasSchoolAccess.mockReturnValue(true);
      repository.updateStatus.mockResolvedValue({ id: 1, ...baseDto, status: 'CLOSED' } as any);

      const result = await service.close(1, 2);

      expect(repository.updateStatus).toHaveBeenCalledWith(1, 'CLOSED');
      expect(result).toEqual(expect.objectContaining({ status: 'CLOSED' }));
    });
  });

  describe('findOneAsOwnerOrManager', () => {
    it('allows the report owner to read their own report without manager access', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'DRAFT' } as any);

      const result = await service.findOneAsOwnerOrManager(1, 10 /* = baseDto.userId */);

      expect(result).toEqual(expect.objectContaining({ id: 1 }));
      expect(tenantContextService.resolve).not.toHaveBeenCalled();
    });

    it('denies a non-owner without manager access to the report school', async () => {
      repository.findOne.mockResolvedValue({ id: 1, ...baseDto, status: 'DRAFT' } as any);
      tenantContextService.resolve.mockResolvedValue({ userId: 99, isMaster: false, subjectId: null, links: [] });
      tenantContextService.hasSchoolAccess.mockReturnValue(false);

      await expect(service.findOneAsOwnerOrManager(1, 99)).rejects.toThrow(ForbiddenException);
    });
  });
});
