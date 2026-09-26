import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesRepository } from './classes.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('ClassesService', () => {
  let service: ClassesService;
  let repository: ClassesRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getCoverageCounts: jest.fn(),
  };

  let mockDb: {
    select: jest.Mock;
    update: jest.Mock;
    query: { users: { findFirst: jest.Mock } };
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
      query: { users: { findFirst: jest.fn() } },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: ClassesRepository, useValue: mockRepository },
        { provide: DrizzleService, useValue: { db: mockDb } },
        // TenantContextService real (não mockado): só depende do
        // DrizzleService acima, então os testes controlam seu
        // comportamento mockando mockDb.query.users.findFirst, igual ao
        // que a classe realmente chama em produção.
        TenantContextService,
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    repository = module.get<ClassesRepository>(ClassesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { schoolId: 1, subjectId: 1, createdByd: 1 } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll with user schoolId if profile is not PROFESSOR', async () => {
      const params = { userId: 1 };
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 10,
            profileId: 1,
            approvedAt: new Date(),
            profile: { name: 'DIRETOR' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params as any);

      expect(repository.findAll).toHaveBeenCalledWith({
        schoolId: 10,
        available: undefined,
      });
    });

    it('should call repository.findAll with original params if profile is PROFESSOR', async () => {
      const params = { userId: 1 };
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 10,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params as any);

      expect(repository.findAll).toHaveBeenCalledWith(params);
    });

    it('should call repository.findAll with original params if no userId', async () => {
      const params = {};
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params as any);

      expect(repository.findAll).toHaveBeenCalledWith(params);
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

  describe('update', () => {
    it('should call repository.update when requester has manager access to the class school', async () => {
      const dto = { registredById: 2 } as any;
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 1,
            approvedAt: new Date(),
            profile: { name: 'DIRETOR' },
          },
        ],
      });
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });

      const result = await service.update(1, dto, 5);

      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('should throw ForbiddenException when requester has no approved link to the class school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        upsUser: [
          {
            schoolId: 99,
            profileId: 1,
            approvedAt: new Date(),
            profile: { name: 'DIRETOR' },
          },
        ],
      });

      await expect(service.update(1, {} as any, 5)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when class does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(1, {} as any, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should call repository.remove when requester has manager access to the class school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 4,
            approvedAt: new Date(),
            profile: { name: 'MASTER' },
          },
        ],
      });
      mockRepository.remove.mockResolvedValue({ id: 1 });

      const result = await service.remove(1, 5);

      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });

    it('should throw ForbiddenException when requester has no approved link to the class school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({ id: 5, upsUser: [] });

      await expect(service.remove(1, 5)).rejects.toThrow(ForbiddenException);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('enroll', () => {
    it('should enroll the professor when the class is free', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDrizzleChainMock([{ id: 1, enrolledById: null }]),
        )
        .mockReturnValueOnce(createDrizzleChainMock([{ id: 2 }]));
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, enrolledById: 2 }]),
      );

      const result = await service.enroll(1, 2);

      expect(result).toEqual({ id: 1, enrolledById: 2 });
    });

    it('should throw NotFoundException when class does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createDrizzleChainMock([]));
      await expect(service.enroll(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when class already enrolled by another professor', async () => {
      mockDb.select
        .mockReturnValueOnce(
          createDrizzleChainMock([{ id: 1, enrolledById: 99 }]),
        )
        .mockReturnValueOnce(createDrizzleChainMock([{ id: 2 }]));
      await expect(service.enroll(1, 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('unenroll', () => {
    it('should unenroll the professor who is currently enrolled', async () => {
      mockDb.select.mockReturnValueOnce(
        createDrizzleChainMock([{ id: 1, enrolledById: 2 }]),
      );
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, enrolledById: null }]),
      );

      const result = await service.unenroll(1, 2);

      expect(result).toEqual({ id: 1, enrolledById: null });
    });

    it('should throw ForbiddenException when another professor tries to unenroll', async () => {
      mockDb.select.mockReturnValueOnce(
        createDrizzleChainMock([{ id: 1, enrolledById: 2 }]),
      );
      await expect(service.unenroll(1, 99)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getCoverageStats', () => {
    it('should return "baixo" risco when coverage rate is >= 0.7', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 10,
        cobertas: 8,
      });

      const result = await service.getCoverageStats({ schoolId: 1 } as any);

      expect(result).toEqual({
        totalVagas: 10,
        cobertas: 8,
        taxaCobertura: 0.8,
        nivel: 'baixo',
      });
    });

    it('should return "medio" risco when coverage rate is between 0.4 and 0.7', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 10,
        cobertas: 5,
      });

      const result = await service.getCoverageStats({} as any);

      expect(result.nivel).toBe('medio');
      expect(result.taxaCobertura).toBe(0.5);
    });

    it('should return "alto" risco when coverage rate is below 0.4', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 10,
        cobertas: 2,
      });

      const result = await service.getCoverageStats({} as any);

      expect(result.nivel).toBe('alto');
      expect(result.taxaCobertura).toBe(0.2);
    });

    it('should return "alto" risco and taxaCobertura=0 when there is no data (totalVagas=0)', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 0,
        cobertas: 0,
      });

      const result = await service.getCoverageStats({} as any);

      expect(result).toEqual({
        totalVagas: 0,
        cobertas: 0,
        taxaCobertura: 0,
        nivel: 'alto',
      });
    });
  });
});
