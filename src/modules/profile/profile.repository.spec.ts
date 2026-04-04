import { Test, TestingModule } from '@nestjs/testing';
import { ProfileRepository } from './profile.repository';
import { PrismaService } from '../../prisma.service';

describe('ProfileRepository', () => {
  let repository: ProfileRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    profiles: {
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
        ProfileRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ProfileRepository>(ProfileRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a profile', async () => {
      const dto = { name: 'Admin' };
      mockPrismaService.profiles.create.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.create(dto as any);
      expect(prismaService.profiles.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all profiles', async () => {
      mockPrismaService.profiles.findMany.mockResolvedValue([]);
      const result = await repository.findAll();
      expect(prismaService.profiles.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find one profile', async () => {
      mockPrismaService.profiles.findUnique.mockResolvedValue({ id: 1 });
      const result = await repository.findOne(1);
      expect(prismaService.profiles.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const dto = { name: 'Super Admin' };
      mockPrismaService.profiles.update.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.update(1, dto as any);
      expect(prismaService.profiles.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should remove a profile', async () => {
      mockPrismaService.profiles.delete.mockResolvedValue({ id: 1 });
      const result = await repository.remove(1);
      expect(prismaService.profiles.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ id: 1 });
    });
  });
});
