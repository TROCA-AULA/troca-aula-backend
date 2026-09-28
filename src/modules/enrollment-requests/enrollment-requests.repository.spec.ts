import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('EnrollmentRequestsRepository', () => {
  let repository: EnrollmentRequestsRepository;
  let mockDb: { insert: jest.Mock; select: jest.Mock; update: jest.Mock };

  const createdAt = new Date('2026-01-15T10:00:00.000Z');
  const baseRequest = {
    id: 1,
    classId: 10,
    professorId: 20,
    status: 'PENDING',
    createdAt,
    updatedAt: createdAt,
  };

  // A segunda query de `findAll` (contador de substituições aprovadas) usa
  // `.groupBy()`, que o helper compartilhado não encadeia. Estendemos a
  // cadeia localmente (sem tocar no helper, compartilhado com outros specs).
  const createTotalsChain = (
    totals: Array<{ professorId: number; total: number }>,
  ) => {
    const chain = createDrizzleChainMock(totals);
    chain.groupBy = jest.fn(() => chain);
    return chain;
  };

  beforeEach(async () => {
    mockDb = { insert: jest.fn(), select: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentRequestsRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<EnrollmentRequestsRepository>(
      EnrollmentRequestsRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should insert with updatedAt and return the created request', async () => {
      const chain = createDrizzleChainMock([baseRequest]);
      mockDb.insert.mockReturnValue(chain);

      const result = await repository.create({
        classId: 10,
        professorId: 20,
        status: 'PENDING',
      });

      expect(result).toEqual(baseRequest);
      expect(chain.values).toHaveBeenCalledWith({
        classId: 10,
        professorId: 20,
        status: 'PENDING',
        updatedAt: expect.any(Date),
      });
    });

    it('should return undefined when returning() yields no row', async () => {
      mockDb.insert.mockReturnValue(createDrizzleChainMock([]));

      await expect(
        repository.create({ classId: 10, professorId: 20, status: 'PENDING' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should apply every filter, join profile data and aggregate approved totals', async () => {
      const row = {
        enrollmentRequest: baseRequest,
        schoolSince: new Date('2024-02-01T00:00:00.000Z'),
        professorName: 'Prof. Ana',
        professorEmail: 'ana@example.com',
        professorSubjectId: 5,
        professorSubjectName: 'Matemática',
      };
      mockDb.select
        .mockReturnValueOnce(createDrizzleChainMock([row]))
        .mockReturnValueOnce(
          createTotalsChain([{ professorId: 20, total: 3 }]),
        );

      const result = await repository.findAll({
        status: 'PENDING',
        classId: 10,
        professorId: 20,
        schoolId: 7,
        createdAtGte: new Date('2026-01-01T00:00:00.000Z'),
        createdAtLte: new Date('2026-01-31T00:00:00.000Z'),
        createdAtLt: new Date('2026-02-01T00:00:00.000Z'),
      });

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        {
          ...baseRequest,
          schoolSince: row.schoolSince,
          user: {
            id: 20,
            name: 'Prof. Ana',
            email: 'ana@example.com',
            subject: { id: 5, name: 'Matemática' },
            totalSubstitutions: 3,
          },
        },
      ]);
    });

    it('should map null subject/email while joining the totals map', async () => {
      const row = {
        enrollmentRequest: { ...baseRequest, id: 2, professorId: 21 },
        schoolSince: null,
        professorName: 'Prof. Bruno',
        professorEmail: null,
        professorSubjectId: null,
        professorSubjectName: null,
      };
      mockDb.select
        .mockReturnValueOnce(createDrizzleChainMock([row]))
        .mockReturnValueOnce(
          createTotalsChain([{ professorId: 21, total: 2 }]),
        );

      const result = await repository.findAll({});

      expect(result).toEqual([
        {
          ...row.enrollmentRequest,
          schoolSince: null,
          user: {
            id: 21,
            name: 'Prof. Bruno',
            email: null,
            subject: null,
            totalSubstitutions: 2,
          },
        },
      ]);
    });

    it('should use totalSubstitutions 0 when the professor has no entry in the totals map', async () => {
      const row = {
        enrollmentRequest: { ...baseRequest, id: 3, professorId: 22 },
        schoolSince: null,
        professorName: 'Prof. Carla',
        professorEmail: 'carla@example.com',
        professorSubjectId: 6,
        professorSubjectName: 'História',
      };
      mockDb.select
        .mockReturnValueOnce(createDrizzleChainMock([row]))
        .mockReturnValueOnce(
          createTotalsChain([{ professorId: 999, total: 7 }]),
        );

      const result = await repository.findAll({ professorId: 22 });

      expect(result[0].user).toEqual({
        id: 22,
        name: 'Prof. Carla',
        email: 'carla@example.com',
        subject: { id: 6, name: 'História' },
        totalSubstitutions: 0,
      });
    });

    it('should omit the user when the professor name is missing', async () => {
      const row = {
        enrollmentRequest: { ...baseRequest, id: 4 },
        schoolSince: null,
        professorName: null,
        professorEmail: null,
        professorSubjectId: null,
        professorSubjectName: null,
      };
      mockDb.select
        .mockReturnValueOnce(createDrizzleChainMock([row]))
        .mockReturnValueOnce(createTotalsChain([]));

      const result = await repository.findAll({});

      expect(result).toEqual([
        { ...row.enrollmentRequest, schoolSince: null, user: undefined },
      ]);
    });

    it('should skip the totals query and use where(undefined) when there are no filters or rows', async () => {
      const rowsChain = createDrizzleChainMock([]);
      mockDb.select.mockReturnValueOnce(rowsChain);

      const result = await repository.findAll({});

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(rowsChain.where).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should apply every filter and return the numeric count', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([{ value: 5 }]));

      await expect(
        repository.count({
          status: 'APPROVED',
          classId: 10,
          professorId: 20,
          createdAtGte: new Date('2026-01-01T00:00:00.000Z'),
          createdAtLte: new Date('2026-01-31T00:00:00.000Z'),
          createdAtLt: new Date('2026-02-01T00:00:00.000Z'),
        }),
      ).resolves.toBe(5);
    });

    it('should return 0 when the aggregate query returns no row', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));

      await expect(repository.count({})).resolves.toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return the request when found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([baseRequest]));

      await expect(repository.findOne(1)).resolves.toEqual(baseRequest);
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));

      await expect(repository.findOne(999)).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('should set status plus updatedAt and return the updated row', async () => {
      const updated = { ...baseRequest, status: 'APPROVED' };
      const chain = createDrizzleChainMock([updated]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.update(1, { status: 'APPROVED' });

      expect(result).toEqual(updated);
      expect(chain.set).toHaveBeenCalledWith({
        status: 'APPROVED',
        updatedAt: expect.any(Date),
      });
    });

    it('should return undefined when returning() yields no row', async () => {
      mockDb.update.mockReturnValue(createDrizzleChainMock([]));

      await expect(
        repository.update(999, { status: 'CANCELLED' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findByClassAndProfessor', () => {
    it('should find by class and professor without status', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([baseRequest]));

      await expect(repository.findByClassAndProfessor(10, 20)).resolves.toEqual(
        [baseRequest],
      );
    });

    it('should add the status filter when provided', async () => {
      const approved = { ...baseRequest, status: 'APPROVED' };
      mockDb.select.mockReturnValue(createDrizzleChainMock([approved]));

      await expect(
        repository.findByClassAndProfessor(10, 20, 'APPROVED'),
      ).resolves.toEqual([approved]);
    });
  });
});
