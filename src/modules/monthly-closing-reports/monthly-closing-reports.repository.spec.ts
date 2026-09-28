import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyClosingReportsRepository } from './monthly-closing-reports.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('MonthlyClosingReportsRepository', () => {
  let repository: MonthlyClosingReportsRepository;
  let mockDb: {
    insert: jest.Mock;
    update: jest.Mock;
    query: {
      monthlyClosingReports: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
      };
      teacherWorkloadRecords: { findMany: jest.Mock };
    };
  };

  const report = {
    id: 1,
    userId: 2,
    schoolId: 3,
    referenceMonth: '2026-01',
    workloadBreakdown: { total: 10, AULA: 10 },
    status: 'DRAFT',
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      update: jest.fn(),
      query: {
        monthlyClosingReports: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        teacherWorkloadRecords: { findMany: jest.fn() },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyClosingReportsRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<MonthlyClosingReportsRepository>(
      MonthlyClosingReportsRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByKey', () => {
    it('should filter by user, school and reference month', async () => {
      mockDb.query.monthlyClosingReports.findFirst.mockResolvedValue(report);

      await expect(repository.findByKey(2, 3, '2026-01')).resolves.toEqual(
        report,
      );
      expect(mockDb.query.monthlyClosingReports.findFirst).toHaveBeenCalledWith(
        { where: expect.anything() },
      );
    });
  });

  describe('findOne', () => {
    it('should filter by id and return the report', async () => {
      mockDb.query.monthlyClosingReports.findFirst.mockResolvedValue(report);

      await expect(repository.findOne(1)).resolves.toEqual(report);
      expect(mockDb.query.monthlyClosingReports.findFirst).toHaveBeenCalledWith(
        { where: expect.anything() },
      );
    });

    it('should propagate null when not found', async () => {
      mockDb.query.monthlyClosingReports.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(999)).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('should apply every filter and order by referenceMonth desc', async () => {
      mockDb.query.monthlyClosingReports.findMany.mockResolvedValue([report]);

      const result = await repository.findAll({
        userId: 2,
        schoolId: 3,
        referenceMonth: '2026-01',
      });

      expect(result).toEqual([report]);
      const options =
        mockDb.query.monthlyClosingReports.findMany.mock.calls[0][0];
      expect(options.where).toBeDefined();

      const desc = jest.fn((field: unknown) => ({ desc: field }));
      const fields = { referenceMonth: 'referenceMonth' };
      expect(options.orderBy(fields, { desc })).toEqual([
        { desc: 'referenceMonth' },
      ]);
      expect(desc).toHaveBeenCalledWith(fields.referenceMonth);
    });

    it('should use where(undefined) when no filter is provided', async () => {
      mockDb.query.monthlyClosingReports.findMany.mockResolvedValue([]);

      const result = await repository.findAll({});

      expect(result).toEqual([]);
      expect(mockDb.query.monthlyClosingReports.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('aggregateWorkload', () => {
    it('should sum hours per workload type code and the total', async () => {
      mockDb.query.teacherWorkloadRecords.findMany.mockResolvedValue([
        { hours: '10.5', workloadType: { code: 'AULA' } },
        { hours: 4, workloadType: { code: 'AULA' } },
        { hours: '2', workloadType: { code: 'COORD' } },
      ]);

      const result = await repository.aggregateWorkload(2, 3, '2026-02');

      expect(result).toEqual({ total: 16.5, AULA: 14.5, COORD: 2 });
      expect(mockDb.query.teacherWorkloadRecords.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ with: { workloadType: true } }),
      );
    });

    it('should return only total 0 when there are no records', async () => {
      mockDb.query.teacherWorkloadRecords.findMany.mockResolvedValue([]);

      await expect(
        repository.aggregateWorkload(2, 3, '2026-02'),
      ).resolves.toEqual({ total: 0 });
    });
  });

  describe('create', () => {
    it('should insert as DRAFT and return the created report', async () => {
      const chain = createDrizzleChainMock([report]);
      mockDb.insert.mockReturnValue(chain);

      const result = await repository.create({
        userId: 2,
        schoolId: 3,
        referenceMonth: '2026-01',
        workloadBreakdown: { total: 10, AULA: 10 },
      });

      expect(result).toEqual(report);
      expect(chain.values).toHaveBeenCalledWith({
        userId: 2,
        schoolId: 3,
        referenceMonth: '2026-01',
        workloadBreakdown: { total: 10, AULA: 10 },
        status: 'DRAFT',
      });
    });

    it('should return undefined when returning() yields no row', async () => {
      mockDb.insert.mockReturnValue(createDrizzleChainMock([]));

      await expect(
        repository.create({
          userId: 2,
          schoolId: 3,
          referenceMonth: '2026-01',
          workloadBreakdown: { total: 0 },
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('updateBreakdown', () => {
    it('should set the workload breakdown and return the updated report', async () => {
      const breakdown = { total: 12, AULA: 12 };
      const updated = { ...report, workloadBreakdown: breakdown };
      const chain = createDrizzleChainMock([updated]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.updateBreakdown(1, breakdown);

      expect(result).toEqual(updated);
      expect(chain.set).toHaveBeenCalledWith({ workloadBreakdown: breakdown });
    });
  });

  describe('updateStatus', () => {
    it('should reopen as DRAFT clearing the previous review', async () => {
      const chain = createDrizzleChainMock([
        { ...report, status: 'DRAFT', reviewedById: null, reviewedAt: null },
      ]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.updateStatus(1, 'DRAFT');

      expect(result).toEqual({
        ...report,
        status: 'DRAFT',
        reviewedById: null,
        reviewedAt: null,
      });
      expect(chain.set).toHaveBeenCalledWith({
        status: 'DRAFT',
        reviewedById: null,
        reviewedAt: null,
      });
    });

    it('should register the review when reviewedById is provided', async () => {
      const chain = createDrizzleChainMock([
        { ...report, status: 'REVIEWED', reviewedById: 9 },
      ]);
      mockDb.update.mockReturnValue(chain);

      await repository.updateStatus(1, 'REVIEWED', 9);

      expect(chain.set).toHaveBeenCalledWith({
        status: 'REVIEWED',
        reviewedById: 9,
        reviewedAt: expect.any(Date),
      });
    });

    it('should only change the status when reviewedById is omitted', async () => {
      const chain = createDrizzleChainMock([{ ...report, status: 'CLOSED' }]);
      mockDb.update.mockReturnValue(chain);

      await repository.updateStatus(1, 'CLOSED');

      expect(chain.set).toHaveBeenCalledWith({ status: 'CLOSED' });
    });
  });
});
