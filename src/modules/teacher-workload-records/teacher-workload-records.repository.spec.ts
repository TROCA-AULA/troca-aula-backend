import { Test, TestingModule } from '@nestjs/testing';
import { TeacherWorkloadRecordsRepository } from './teacher-workload-records.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('TeacherWorkloadRecordsRepository', () => {
  let repository: TeacherWorkloadRecordsRepository;
  let mockDb: {
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    query: {
      teacherWorkloadRecords: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
      };
    };
  };

  const record = {
    id: 1,
    userId: 2,
    schoolId: 3,
    networkId: 4,
    workloadTypeId: 5,
    hours: '20.00',
    ataOficialRef: 'ATA-2026-01',
    validFrom: '2026-03-01',
    validTo: '2026-06-30',
    createdById: 9,
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: {
        teacherWorkloadRecords: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherWorkloadRecordsRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<TeacherWorkloadRecordsRepository>(
      TeacherWorkloadRecordsRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should map hours to string and dates to ISO date and return the record', async () => {
      const chain = createDrizzleChainMock([record]);
      mockDb.insert.mockReturnValue(chain);

      const result = await repository.create({
        userId: 2,
        schoolId: 3,
        networkId: 4,
        workloadTypeId: 5,
        hours: 20,
        ataOficialRef: 'ATA-2026-01',
        validFrom: new Date('2026-03-01T00:00:00.000Z'),
        validTo: new Date('2026-06-30T00:00:00.000Z'),
        createdById: 9,
      });

      expect(result).toEqual(record);
      expect(chain.values).toHaveBeenCalledWith({
        userId: 2,
        schoolId: 3,
        networkId: 4,
        workloadTypeId: 5,
        hours: '20',
        ataOficialRef: 'ATA-2026-01',
        validFrom: '2026-03-01',
        validTo: '2026-06-30',
        createdById: 9,
      });
    });

    it('should omit optional ataOficialRef/validTo when not provided', async () => {
      const chain = createDrizzleChainMock([record]);
      mockDb.insert.mockReturnValue(chain);

      await repository.create({
        userId: 2,
        schoolId: 3,
        networkId: 4,
        workloadTypeId: 5,
        hours: 10,
        validFrom: new Date('2026-03-01T00:00:00.000Z'),
        createdById: 9,
      });

      expect(chain.values).toHaveBeenCalledWith({
        userId: 2,
        schoolId: 3,
        networkId: 4,
        workloadTypeId: 5,
        hours: '10',
        ataOficialRef: undefined,
        validFrom: '2026-03-01',
        validTo: undefined,
        createdById: 9,
      });
    });
  });

  describe('findAll', () => {
    it('should apply both filters, include relations and order by validFrom desc', async () => {
      mockDb.query.teacherWorkloadRecords.findMany.mockResolvedValue([record]);

      const result = await repository.findAll({ schoolId: 3, userId: 2 });

      expect(result).toEqual([record]);
      const options =
        mockDb.query.teacherWorkloadRecords.findMany.mock.calls[0][0];
      expect(options.where).toBeDefined();
      expect(options.with).toEqual({ workloadType: true, school: true });

      const desc = jest.fn((field: unknown) => ({ desc: field }));
      const fields = { validFrom: 'validFrom' };
      expect(options.orderBy(fields, { desc })).toEqual([
        { desc: 'validFrom' },
      ]);
      expect(desc).toHaveBeenCalledWith(fields.validFrom);
    });

    it('should apply only schoolId when userId is omitted', async () => {
      mockDb.query.teacherWorkloadRecords.findMany.mockResolvedValue([record]);

      await repository.findAll({ schoolId: 3 });

      expect(mockDb.query.teacherWorkloadRecords.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() }),
      );
    });

    it('should apply only userId when schoolId is omitted', async () => {
      mockDb.query.teacherWorkloadRecords.findMany.mockResolvedValue([]);

      await repository.findAll({ userId: 2 });

      expect(mockDb.query.teacherWorkloadRecords.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() }),
      );
    });

    it('should use where(undefined) when no filter is provided', async () => {
      mockDb.query.teacherWorkloadRecords.findMany.mockResolvedValue([]);

      const result = await repository.findAll({});

      expect(result).toEqual([]);
      expect(mockDb.query.teacherWorkloadRecords.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findOne', () => {
    it('should include workloadType and return the record', async () => {
      mockDb.query.teacherWorkloadRecords.findFirst.mockResolvedValue(record);

      await expect(repository.findOne(1)).resolves.toEqual(record);
      expect(
        mockDb.query.teacherWorkloadRecords.findFirst,
      ).toHaveBeenCalledWith({
        where: expect.anything(),
        with: { workloadType: true },
      });
    });

    it('should return null when not found', async () => {
      mockDb.query.teacherWorkloadRecords.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(999)).resolves.toBeNull();
    });
  });

  describe('sumActiveHours', () => {
    it('should convert the string sum to number', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ total: '12.50' }]),
      );

      await expect(repository.sumActiveHours(3, 2, 5)).resolves.toBe(12.5);
    });

    it('should return 0 when the aggregate returns no row', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));

      await expect(repository.sumActiveHours(3, 2, 5)).resolves.toBe(0);
    });

    it('should exclude the edited record when excludeId is provided', async () => {
      const chain = createDrizzleChainMock([{ total: '8' }]);
      mockDb.select.mockReturnValue(chain);

      await expect(repository.sumActiveHours(3, 2, 5, 99)).resolves.toBe(8);
      expect(chain.where).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should map every provided field and return the updated record', async () => {
      const chain = createDrizzleChainMock([record]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.update(1, {
        workloadTypeId: 6,
        hours: 8.5,
        ataOficialRef: 'ATA-2026-02',
        validFrom: new Date('2026-04-01T00:00:00.000Z'),
        validTo: new Date('2026-05-01T00:00:00.000Z'),
      });

      expect(result).toEqual(record);
      expect(chain.set).toHaveBeenCalledWith({
        workloadTypeId: 6,
        hours: '8.5',
        ataOficialRef: 'ATA-2026-02',
        validFrom: '2026-04-01',
        validTo: '2026-05-01',
      });
    });

    it('should only include the fields that were provided', async () => {
      const chain = createDrizzleChainMock([record]);
      mockDb.update.mockReturnValue(chain);

      await repository.update(1, { hours: 4 });

      expect(chain.set).toHaveBeenCalledWith({ hours: '4' });
    });

    it('should set an empty object when no field is provided', async () => {
      const chain = createDrizzleChainMock([record]);
      mockDb.update.mockReturnValue(chain);

      await repository.update(1, {});

      expect(chain.set).toHaveBeenCalledWith({});
    });
  });

  describe('remove', () => {
    it('should hard-delete and return the removed record', async () => {
      mockDb.delete.mockReturnValue(createDrizzleChainMock([record]));

      await expect(repository.remove(1)).resolves.toEqual(record);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should return undefined when returning() yields no row', async () => {
      mockDb.delete.mockReturnValue(createDrizzleChainMock([]));

      await expect(repository.remove(999)).resolves.toBeUndefined();
    });
  });
});
