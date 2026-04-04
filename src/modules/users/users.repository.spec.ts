import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../../prisma.service';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    users: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usersProfilesSchools: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and user profile school entry', async () => {
      const dto = {
        email: 'test@test.com',
        password: 'password123',
        schoolId: 1,
        profileId: 2,
      };
      mockPrismaService.users.create.mockResolvedValue({ id: 10, email: dto.email });
      mockPrismaService.usersProfilesSchools.create.mockResolvedValue({ id: 1 });

      const result = await repository.create(dto as any);

      expect(prismaService.users.create).toHaveBeenCalled();
      expect(prismaService.usersProfilesSchools.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 10, email: dto.email });
    });
  });

  describe('findAll', () => {
    it('should find all users', async () => {
      mockPrismaService.users.findMany.mockResolvedValue([]);
      const result = await repository.findAll();
      expect(prismaService.users.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find one user by id', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 1 });
      const result = await repository.findOne(1);
      expect(prismaService.users.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { upsUser: true },
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should find one user by email', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });
      const result = await repository.findOneBy('test@test.com');
      expect(prismaService.users.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        include: { upsUser: true },
      });
      expect(result).toEqual({ id: 1, email: 'test@test.com' });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto = { name: 'Updated' };
      mockPrismaService.users.update.mockResolvedValue({ id: 1, ...dto });
      const result = await repository.update(1, dto as any);
      expect(prismaService.users.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockPrismaService.users.delete.mockResolvedValue({ id: 1 });
      const result = await repository.remove(1);
      expect(prismaService.users.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ id: 1 });
    });
  });
});
