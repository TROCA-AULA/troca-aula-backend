import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsRepository } from './schools.repository';
import { PrismaService } from '../../prisma.service';

describe('SchoolsRepository', () => {
  let repository: SchoolsRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    schools: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SchoolsRepository>(SchoolsRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a school', async () => {
      const dto = { name: 'School A' };
      mockPrismaService.schools.create.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.create(dto);
      expect(prismaService.schools.create).toHaveBeenCalledWith({
        data: { ...dto },
      });
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all schools', async () => {
      mockPrismaService.schools.findMany.mockResolvedValue([
        { id: 1, name: 'School A' },
      ]);
      const result = await repository.findAll();
      expect(prismaService.schools.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'School A' }]);
    });
  });

  describe('findOne', () => {
    it('should find one school', async () => {
      mockPrismaService.schools.findUnique.mockResolvedValue({
        id: 1,
        name: 'School A',
      });
      const result = await repository.findOne(1);
      expect(prismaService.schools.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1, name: 'School A' });
    });
  });

  describe('update', () => {
    it('should update a school', async () => {
      const dto = { name: 'School Updated' };
      mockPrismaService.schools.update.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.update(1, dto);
      expect(prismaService.schools.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto },
      });
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should remove a school', async () => {
      mockPrismaService.schools.delete.mockResolvedValue({
        id: 1,
        name: 'School A',
      });
      const result = await repository.remove(1);
      expect(prismaService.schools.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1, name: 'School A' });
    });
  });
});
