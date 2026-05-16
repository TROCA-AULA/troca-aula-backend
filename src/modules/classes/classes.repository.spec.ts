import { Test, TestingModule } from '@nestjs/testing';
import { ClassesRepository } from './classes.repository';
import { PrismaService } from '../../prisma.service';

describe('ClassesRepository', () => {
  let repository: ClassesRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    classes: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usersProfilesSchools: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ClassesRepository>(ClassesRepository);
    prismaService = module.get<PrismaService>(PrismaService);
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
      mockPrismaService.classes.create.mockResolvedValue({ id: 1 });
      const result = await repository.create(dto as any);
      expect(prismaService.classes.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findAll', () => {
    it('should find all classes with filters', async () => {
      const params = { userId: 1, schoolId: 2 };
      mockPrismaService.classes.findMany.mockResolvedValue([]);
      const result = await repository.findAll(params as any);
      expect(prismaService.classes.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should find all classes without filters', async () => {
      mockPrismaService.classes.findMany.mockResolvedValue([]);
      const result = await repository.findAll({} as any);
      expect(prismaService.classes.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find one class', async () => {
      mockPrismaService.classes.findUnique.mockResolvedValue({ id: 1 });
      const result = await repository.findOne(1);
      expect(prismaService.classes.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update', () => {
    it('should update a class with approvedById', async () => {
      const dto = { approvedById: 2 };
      mockPrismaService.classes.findUnique.mockResolvedValue({
        id: 1,
        schoolId: 10,
      });
      mockPrismaService.usersProfilesSchools.findMany.mockResolvedValue([
        { profileId: 5 },
      ]);
      mockPrismaService.classes.update.mockResolvedValue({ id: 1 });

      const result = await repository.update(1, dto as any);

      expect(prismaService.classes.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.usersProfilesSchools.findMany).toHaveBeenCalled();
      expect(prismaService.classes.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('should update a class with registredById', async () => {
      const dto = { registredById: 3 };
      mockPrismaService.classes.update.mockResolvedValue({ id: 1 });

      const result = await repository.update(1, dto as any);

      expect(prismaService.classes.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('remove', () => {
    it('should remove a class', async () => {
      mockPrismaService.classes.delete.mockResolvedValue({ id: 1 });
      const result = await repository.remove(1);
      expect(prismaService.classes.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1 });
    });
  });
});
