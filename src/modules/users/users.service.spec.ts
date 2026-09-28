import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;
  let tenantContextService: TenantContextService;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignProfile: jest.fn(),
    unassignProfile: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => 10),
  };

  const mockTenantContextService = {
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
    tenantContextService =
      module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { email: 'test@test.com' } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should pass the filter through to repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      await service.findAll({ schoolId: 1, profileId: 3 });
      expect(repository.findAll).toHaveBeenCalledWith({
        schoolId: 1,
        profileId: 3,
      });
    });
  });

  describe('assignProfile', () => {
    it('should call repository.assignProfile with approvedById', async () => {
      mockRepository.assignProfile.mockResolvedValue({
        userId: 1,
        profileId: 2,
        schoolId: 3,
      });
      const result = await service.assignProfile(1, 2, 3, 9);
      expect(repository.assignProfile).toHaveBeenCalledWith(1, 2, 3, 9);
      expect(result).toEqual({ userId: 1, profileId: 2, schoolId: 3 });
    });
  });

  describe('unassignProfile', () => {
    it('should call repository.unassignProfile', async () => {
      mockRepository.unassignProfile.mockResolvedValue({ userId: 1 });
      const result = await service.unassignProfile(1, 2, 3);
      expect(repository.unassignProfile).toHaveBeenCalledWith(1, 2, 3);
      expect(result).toEqual({ userId: 1 });
    });
  });

  describe('findOne', () => {
    it('should call repository.findOne', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findOne(1);
      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should call repository.findOneBy', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });
      const result = await service.findOneBy('test@test.com');
      expect(repository.findOneBy).toHaveBeenCalledWith('test@test.com');
      expect(result).toEqual({ id: 1, email: 'test@test.com' });
    });
  });

  describe('update', () => {
    it('should call repository.update', async () => {
      const dto = { name: 'Updated' } as any;
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.update(1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should call repository.remove', async () => {
      mockRepository.remove.mockResolvedValue({ id: 1 });
      const result = await service.remove(1);
      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('resetPassword', () => {
    it('allows MASTER to reset any account and returns the temp password once', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 5, upsUser: [] });
      mockTenantContextService.resolve.mockResolvedValue({
        userId: 1,
        isMaster: true,
        subjectId: null,
        links: [],
      });

      const result = await service.resetPassword(5, 1);

      expect(result.tempPassword).toEqual(expect.any(String));
      expect(result.tempPassword.length).toBeGreaterThanOrEqual(8);
      expect(repository.update).toHaveBeenCalledWith(5, {
        password: expect.any(String),
      });
      // A senha devolvida é a crua; o que vai para o banco é o hash.
      expect(mockRepository.update.mock.calls[0][1].password).not.toBe(
        result.tempPassword,
      );
    });

    it('allows a manager of a school shared with the target', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 3, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue({
        userId: 2,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 3,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      });

      const result = await service.resetPassword(5, 2);

      expect(result.tempPassword).toEqual(expect.any(String));
    });

    it('denies a manager without a shared school', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 9, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue({
        userId: 2,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 3,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      });

      await expect(service.resetPassword(5, 2)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(undefined);

      await expect(service.resetPassword(99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
