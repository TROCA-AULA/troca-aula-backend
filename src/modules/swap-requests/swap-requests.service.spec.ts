import { Test, TestingModule } from '@nestjs/testing';
import { SwapRequestsService } from './swap-requests.service';
import { SwapRequestsRepository } from './swap-requests.repository';
import { PrismaService } from '../../prisma.service';
import { UsersModule } from '../users/users.module';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('SwapRequestsService', () => {
  let service: SwapRequestsService;
  let repository: SwapRequestsRepository;
  let prisma: PrismaService;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    classes: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
      providers: [
        SwapRequestsService,
        { provide: SwapRequestsRepository, useValue: mockRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SwapRequestsService>(SwapRequestsService);
    repository = module.get<SwapRequestsRepository>(SwapRequestsRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ForbiddenException when user is not director/admin', async () => {
      const mockUser = {
        id: 1,
        upsUser: [{ profileId: 2, profile: { name: 'PROFESSOR' } }],
      };

      mockPrisma.users.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.classes.findUnique = jest.fn().mockResolvedValue({
        id: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });
      mockPrisma.classes.findMany = jest.fn().mockResolvedValue([]);

      await expect(
        service.create({ classId: 1, targetId: 2 }, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create swap request when user is director', async () => {
      const mockUser = {
        id: 1,
        upsUser: [{ profileId: 1, profile: { name: 'DIRETOR' } }],
      };
      const mockClass = {
        id: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      };

      mockPrisma.users.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.classes.findUnique = jest.fn().mockResolvedValue(mockClass);
      mockPrisma.classes.findMany = jest.fn().mockResolvedValue([]);
      mockRepository.create = jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'PENDING' });

      const result = await service.create({ classId: 1, targetId: 2 }, 1);

      expect(result).toEqual({ id: 1, status: 'PENDING' });
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on schedule conflict', async () => {
      const mockUser = {
        id: 1,
        upsUser: [{ profileId: 1, profile: { name: 'DIRETOR' } }],
      };
      const mockClass = {
        id: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      };
      const conflictingClass = {
        id: 2,
        dayOfWeek: 1,
        startTime: '08:30',
        endTime: '09:30',
      };

      mockPrisma.users.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.classes.findUnique = jest.fn().mockResolvedValue(mockClass);
      mockPrisma.classes.findMany = jest
        .fn()
        .mockResolvedValue([conflictingClass]);

      await expect(
        service.create({ classId: 1, targetId: 2 }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return swap requests for created type', async () => {
      const mockSwapRequests = [{ id: 1 }, { id: 2 }];
      mockRepository.findAll = jest.fn().mockResolvedValue(mockSwapRequests);

      const result = await service.findAll({ type: 'created' }, 1);

      expect(result).toEqual(mockSwapRequests);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        where: { requesterId: 1 },
      });
    });

    it('should return swap requests for received type', async () => {
      const mockSwapRequests = [{ id: 1 }];
      mockRepository.findAll = jest.fn().mockResolvedValue(mockSwapRequests);

      const result = await service.findAll({ type: 'received' }, 1);

      expect(result).toEqual(mockSwapRequests);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        where: { targetId: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('should return swap request when found', async () => {
      const mockSwapRequest = { id: 1, status: 'PENDING' };
      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);

      const result = await service.findOne(1);

      expect(result).toEqual(mockSwapRequest);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('should accept swap request when valid', async () => {
      const mockSwapRequest = {
        id: 1,
        status: 'PENDING',
        targetId: 2,
        classId: 1,
      };
      const mockUser = { id: 2, subjectId: 1 };
      const mockClass = { id: 1, subjectId: 1 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);
      mockPrisma.users.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.classes.findUnique = jest.fn().mockResolvedValue(mockClass);
      mockRepository.update = jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'APPROVED' });

      const result = await service.accept(1, 2);

      expect(result.status).toBe('APPROVED');
    });

    it('should throw BadRequestException when not PENDING', async () => {
      const mockSwapRequest = { id: 1, status: 'APPROVED', targetId: 2 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);

      await expect(service.accept(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not target', async () => {
      const mockSwapRequest = { id: 1, status: 'PENDING', targetId: 2 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);

      await expect(service.accept(1, 3)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('should reject swap request when valid', async () => {
      const mockSwapRequest = { id: 1, status: 'PENDING', targetId: 2 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);
      mockRepository.update = jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'REJECTED' });

      const result = await service.reject(1, 2);

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('cancel', () => {
    it('should cancel swap request when valid', async () => {
      const mockSwapRequest = { id: 1, status: 'PENDING', requesterId: 1 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);
      mockRepository.update = jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'CANCELLED' });

      const result = await service.cancel(1, 1);

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ForbiddenException when not requester', async () => {
      const mockSwapRequest = { id: 1, status: 'PENDING', requesterId: 1 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);

      await expect(service.cancel(1, 2)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when not PENDING', async () => {
      const mockSwapRequest = { id: 1, status: 'APPROVED', requesterId: 1 };

      mockRepository.findOne = jest.fn().mockResolvedValue(mockSwapRequest);

      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});
