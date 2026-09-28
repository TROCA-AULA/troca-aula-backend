import { Test, TestingModule } from '@nestjs/testing';
import { ClassesRepository } from './classes.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('ClassesRepository', () => {
  let repository: ClassesRepository;
  let mockDb: {
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
    query: { classes: { findMany: jest.Mock; findFirst: jest.Mock } };
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      query: { classes: { findMany: jest.fn(), findFirst: jest.fn() } },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<ClassesRepository>(ClassesRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a class', async () => {
      const dto = {
        schoolId: 1,
        subjectId: 1,
        createdByd: 1,
        statededAt: new Date(),
        finishedAt: new Date(),
      };
      mockDb.insert.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await repository.create(dto);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findAll', () => {
    it('should find all classes with filters', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);
      const result = await repository.findAll({
        userId: 1,
        schoolId: 2,
      });
      expect(mockDb.query.classes.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should find all classes without filters', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);
      const result = await repository.findAll({});
      expect(mockDb.query.classes.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find one class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue({ id: 1 });
      const result = await repository.findOne(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('getCoverageCounts', () => {
    it('should return totalVagas and cobertas from two count queries', async () => {
      mockDb.select
        .mockReturnValueOnce(createDrizzleChainMock([{ value: 10 }]))
        .mockReturnValueOnce(createDrizzleChainMock([{ value: 6 }]));

      const result = await repository.getCoverageCounts({
        schoolId: 1,
      });

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ totalVagas: 10, cobertas: 6 });
    });

    it('should default to 0 when there are no rows', async () => {
      mockDb.select
        .mockReturnValueOnce(createDrizzleChainMock([]))
        .mockReturnValueOnce(createDrizzleChainMock([]));

      const result = await repository.getCoverageCounts({});

      expect(result).toEqual({ totalVagas: 0, cobertas: 0 });
    });
  });

  describe('update', () => {
    it('should update a class with approvedById (resolves profileId via UsersProfilesSchools)', async () => {
      const dto = { approvedById: 2 };
      mockDb.query.classes.findFirst.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.select.mockReturnValue(createDrizzleChainMock([{ profileId: 5 }]));
      mockDb.update.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));

      const result = await repository.update(1, dto);

      expect(mockDb.query.classes.findFirst).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('should update a class with registredById', async () => {
      const dto = { registredById: 3 };
      mockDb.update.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));

      const result = await repository.update(1, dto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('remove', () => {
    it('should soft-delete a class', async () => {
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, deletedAt: new Date() }]),
      );
      const result = await repository.remove(1);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });
});
