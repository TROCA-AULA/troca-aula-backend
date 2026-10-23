import { Test, TestingModule } from '@nestjs/testing';
import { ClassesRepository, toLocalSlot } from './classes.repository';
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
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
            runPrivileged: (fn: () => unknown) => fn(),
          },
        },
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

  describe('toLocalSlot (D7: dia e horário derivados das datas)', () => {
    it('converte para o fuso de Brasília (padrão): 13h UTC de uma sexta = 10h', () => {
      expect(toLocalSlot(new Date('2026-10-23T13:00:00.000Z'))).toEqual({
        dayOfWeek: 5,
        time: '10:00',
      });
    });

    it('vira o dia quando o horário UTC já passou da meia-noite', () => {
      // 02h UTC de sábado = 23h de sexta em Brasília
      expect(toLocalSlot(new Date('2026-10-24T02:30:00.000Z'))).toEqual({
        dayOfWeek: 5,
        time: '23:30',
      });
    });

    it('respeita APP_TIMEZONE quando definido', () => {
      process.env.APP_TIMEZONE = 'UTC';
      try {
        expect(toLocalSlot(new Date('2026-10-25T00:15:00.000Z'))).toEqual({
          dayOfWeek: 0,
          time: '00:15',
        });
      } finally {
        delete process.env.APP_TIMEZONE;
      }
    });
  });

  describe('create — grava dia da semana e horário', () => {
    it('preenche dayOfWeek/startTime/endTime a partir das datas', async () => {
      const chain = createDrizzleChainMock([{ id: 1 }]);
      mockDb.insert.mockReturnValue(chain);

      await repository.create({
        schoolId: 1,
        subjectId: 2,
        createdByd: 3,
        statededAt: new Date('2026-10-23T13:00:00.000Z'),
        finishedAt: new Date('2026-10-23T14:30:00.000Z'),
      });

      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfWeek: 5,
          startTime: '10:00',
          endTime: '11:30',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('filtra por várias escolas (gestor de mais de uma escola)', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);
      await repository.findAll({ schoolIds: [1, 2] });
      expect(mockDb.query.classes.findMany).toHaveBeenCalled();
    });

    it('lista vazia de escolas não devolve nada (sem cair em "todas")', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);
      await repository.findAll({ schoolIds: [] });
      expect(mockDb.query.classes.findMany).toHaveBeenCalled();
    });

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
