import { Test, TestingModule } from '@nestjs/testing';
import { SubjectRepository } from './subjects.repository';
import { PrismaService } from '../../prisma.service';

describe('SubjectRepository', () => {
  let repository: SubjectRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    subjects: {
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
        SubjectRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SubjectRepository>(SubjectRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a subject', async () => {
      const dto = { name: 'Math' };
      mockPrismaService.subjects.create.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.create(dto);
      expect(prismaService.subjects.create).toHaveBeenCalledWith({
        data: { ...dto },
      });
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all subjects', async () => {
      mockPrismaService.subjects.findMany.mockResolvedValue([
        { id: 1, name: 'Math' },
      ]);
      const result = await repository.findAll();
      expect(prismaService.subjects.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Math' }]);
    });
  });

  describe('findOne', () => {
    it('should find one subject', async () => {
      mockPrismaService.subjects.findUnique.mockResolvedValue({
        id: 1,
        name: 'Math',
      });
      const result = await repository.findOne(1);
      expect(prismaService.subjects.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1, name: 'Math' });
    });
  });

  describe('update', () => {
    it('should update a subject', async () => {
      const dto = { name: 'Math Updated' };
      mockPrismaService.subjects.update.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.update(1, dto);
      expect(prismaService.subjects.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto },
      });
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should remove a subject', async () => {
      mockPrismaService.subjects.delete.mockResolvedValue({
        id: 1,
        name: 'Math',
      });
      const result = await repository.remove(1);
      expect(prismaService.subjects.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1, name: 'Math' });
    });
  });
});
