import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentRequestsService } from './enrollment-requests.service';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { ClassesRepository } from '../classes/classes.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('EnrollmentRequestsService', () => {
  let service: EnrollmentRequestsService;
  let repository: EnrollmentRequestsRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockClassesRepository = {
    findOne: jest.fn(),
  };

  // tx simula o objeto de transação passado para db.transaction(async (tx) => ...)
  const mockTx = {
    update: jest.fn(),
  };

  let mockDb: {
    select: jest.Mock;
    transaction: jest.Mock;
    query: { users: { findFirst: jest.Mock } };
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) =>
        callback(mockTx),
      ),
      query: { users: { findFirst: jest.fn() } },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentRequestsService,
        { provide: EnrollmentRequestsRepository, useValue: mockRepository },
        { provide: UsersRepository, useValue: mockUserRepository },
        { provide: ClassesRepository, useValue: mockClassesRepository },
        { provide: DrizzleService, useValue: { db: mockDb } },
        // TenantContextService real: usa o mesmo mockDb acima (query.users.findFirst).
        TenantContextService,
      ],
    }).compile();

    service = module.get<EnrollmentRequestsService>(EnrollmentRequestsService);
    repository = module.get<EnrollmentRequestsRepository>(
      EnrollmentRequestsRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRepository.count.mockResolvedValue(0);
  });

  describe('create', () => {
    it('should create an enrollment request successfully', async () => {
      const classData = {
        id: 1,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
        available: true,
      };
      const professor = { id: 2, subjectId: 1 };

      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockUserRepository.findOne.mockResolvedValue(professor);
      mockRepository.findAll.mockResolvedValue([]);
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      mockRepository.create.mockResolvedValue({
        id: 1,
        classId: 1,
        professorId: 2,
        status: 'PENDING',
      });

      const result = await service.create(1, 2);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
    });

    it('should throw NotFoundException when class not found', async () => {
      mockClassesRepository.findOne.mockResolvedValue(null);

      await expect(service.create(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when class not available', async () => {
      mockClassesRepository.findOne.mockResolvedValue({
        id: 1,
        available: false,
      });

      await expect(service.create(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already has pending request', async () => {
      const classData = { id: 1, available: true, subjectId: 1 };
      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockRepository.findAll.mockResolvedValue([{ id: 1 }]);

      await expect(service.create(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when subject does not match', async () => {
      const classData = { id: 1, available: true, subjectId: 1 };
      const professor = { id: 2, subjectId: 2 };

      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockUserRepository.findOne.mockResolvedValue(professor);
      mockRepository.findAll.mockResolvedValue([]);

      await expect(service.create(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return enrollment requests for director', async () => {
      const requests = [{ id: 1 }, { id: 2 }];

      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockRepository.findAll.mockResolvedValue(requests);

      const result = await service.findAll({} as any, 1);

      expect(result).toEqual(requests);
    });

    it('should return only own requests for non-director', async () => {
      const requests = [{ id: 1, professorId: 2 }];

      mockDb.query.users.findFirst.mockResolvedValue({
        id: 2,
        upsUser: [{ profile: { name: 'PROFESSOR' }, schoolId: 1 }],
      });
      mockRepository.findAll.mockResolvedValue(requests);

      await service.findAll({} as any, 2);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ professorId: 2 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return enrollment request', async () => {
      const request = { id: 1 };
      mockRepository.findOne.mockResolvedValue(request);

      const result = await service.findOne(1);

      expect(result).toEqual(request);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve enrollment request and link professor atomically', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      const classData = { id: 1, schoolId: 1, subjectId: 1 };

      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(createDrizzleChainMock([classData]));
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockTx.update.mockReturnValue(
        createDrizzleChainMock([{ ...request, status: 'APPROVED' }]),
      );

      const result = await service.approve(1, 3);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('APPROVED');
    });

    it('should throw BadRequestException when not pending', async () => {
      const request = { id: 1, status: 'APPROVED' };
      mockRepository.findOne.mockResolvedValue(request);

      await expect(service.approve(1, 1)).rejects.toThrow(BadRequestException);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should reject enrollment request', async () => {
      const request = { id: 1, classId: 1, status: 'PENDING' };
      const classData = { id: 1, schoolId: 1 };

      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(createDrizzleChainMock([classData]));
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockRepository.update.mockResolvedValue({
        ...request,
        status: 'REJECTED',
      });

      const result = await service.reject(1, 3);

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('cancel', () => {
    it('should cancel own pending request', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      mockRepository.findOne.mockResolvedValue(request);
      mockRepository.update.mockResolvedValue({
        ...request,
        status: 'CANCELLED',
      });

      const result = await service.cancel(1, 2);

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ForbiddenException when not own request', async () => {
      const request = { id: 1, professorId: 2 };
      mockRepository.findOne.mockResolvedValue(request);

      await expect(service.cancel(1, 3)).rejects.toThrow(ForbiddenException);
    });

    it('should release class atomically when cancelling approved enrollment', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'APPROVED' };
      const classData = { id: 1, enrolledById: 2 };

      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(createDrizzleChainMock([classData]));
      mockTx.update.mockReturnValue(
        createDrizzleChainMock([{ ...request, status: 'CANCELLED' }]),
      );

      const result = await service.cancel(1, 2);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('CANCELLED');
    });
  });
});
