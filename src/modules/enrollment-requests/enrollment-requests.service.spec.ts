import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentRequestsService } from './enrollment-requests.service';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { ClassesRepository } from '../classes/classes.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { EmailService } from '../email/email.service';
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

  // O veredito de visibilidade é testado a fundo no eligibility.service.spec;
  // aqui garantimos que a candidatura propaga o 403 dele (defesa em
  // profundidade) quando o motor reprova.
  const mockEligibility = {
    assertCanApply: jest.fn(),
  };

  const mockEmail = {
    send: jest.fn(),
    sendMany: jest.fn(),
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
        { provide: EligibilityService, useValue: mockEligibility },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<EnrollmentRequestsService>(EnrollmentRequestsService);
    repository = module.get<EnrollmentRequestsRepository>(
      EnrollmentRequestsRepository,
    );

    mockEligibility.assertCanApply.mockResolvedValue({ visible: true });
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

    // Defesa em profundidade: ClassesService.findAll já usa o mesmo motor na
    // listagem, mas isso não impede alguém de tentar se candidatar direto
    // sabendo o classId - a candidatura propaga o 403 do motor.
    it('delegates the visibility gate to the eligibility engine', async () => {
      const classData = {
        id: 1,
        available: true,
        subjectId: 1,
        schoolId: 99,
        createdAt: new Date(),
      };
      const professor = { id: 2, subjectId: 1 };

      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockUserRepository.findOne.mockResolvedValue(professor);
      mockRepository.findAll.mockResolvedValue([]);
      mockEligibility.assertCanApply.mockRejectedValueOnce(
        new ForbiddenException('Você excluiu esta escola das suas vagas'),
      );

      await expect(service.create(1, 2)).rejects.toThrow(ForbiddenException);
      expect(mockEligibility.assertCanApply).toHaveBeenCalledWith(2, {
        schoolId: 99,
        createdAt: classData.createdAt,
      });
    });

    it('should allow the candidatura when the eligibility engine approves', async () => {
      const classData = {
        id: 1,
        available: true,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
        schoolId: 99,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
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

      expect(result.status).toBe('PENDING');
    });

    it('should allow the candidatura when the professor is linked to the school', async () => {
      const classData = {
        id: 1,
        available: true,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
        schoolId: 10,
        createdAt: new Date(),
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

      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when semester limit is reached', async () => {
      const classData = {
        id: 1,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
        available: true,
      };
      const professor = {
        id: 2,
        subjectId: 1,
        substitutionLimitPerSemester: 2,
      };

      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockUserRepository.findOne.mockResolvedValue(professor);
      mockRepository.findAll.mockResolvedValue([]);
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      mockRepository.count.mockResolvedValue(2);

      await expect(service.create(1, 2)).rejects.toThrow(BadRequestException);
    });

    // Regressão do bug real: a contagem tinha que ser recortada pelo
    // semestre atual (servidor), não pela carreira inteira do professor.
    it('should scope the approved-substitutions count to the current semester', async () => {
      const classData = {
        id: 1,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
        available: true,
      };
      const professor = {
        id: 2,
        subjectId: 1,
        substitutionLimitPerSemester: 5,
      };

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

      await service.create(1, 2);

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          professorId: 2,
          status: 'APPROVED',
          createdAtGte: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when the professor does not exist', async () => {
      mockClassesRepository.findOne.mockResolvedValue({
        id: 1,
        available: true,
        subjectId: 1,
      });
      mockRepository.findAll.mockResolvedValue([]);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.create(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should skip counting substitutions when the professor limit is zero', async () => {
      mockClassesRepository.findOne.mockResolvedValue({
        id: 1,
        available: true,
        subjectId: 1,
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        subjectId: 1,
        substitutionLimitPerSemester: 0,
      });
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.create.mockResolvedValue({ id: 1, status: 'PENDING' });

      await service.create(1, 2);

      expect(mockRepository.count).not.toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it.each<
      [
        string,
        {
          dayOfWeek: number | null;
          startTime: string | null;
          endTime: string | null;
        },
      ]
    >([
      [
        'dayOfWeek is missing',
        { dayOfWeek: null, startTime: '08:00', endTime: '09:00' },
      ],
      [
        'startTime is missing',
        { dayOfWeek: 1, startTime: null, endTime: '09:00' },
      ],
      [
        'endTime is missing',
        { dayOfWeek: 1, startTime: '08:00', endTime: null },
      ],
    ])('should not query conflicts when %s', async (_label, schedule) => {
      mockClassesRepository.findOne.mockResolvedValue({
        id: 1,
        available: true,
        subjectId: 1,
        ...schedule,
      });
      mockUserRepository.findOne.mockResolvedValue({ id: 2, subjectId: 1 });
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.create.mockResolvedValue({ id: 1, status: 'PENDING' });

      await service.create(1, 2);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when the class overlaps another class of the professor', async () => {
      mockClassesRepository.findOne.mockResolvedValue({
        id: 1,
        available: true,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });
      mockUserRepository.findOne.mockResolvedValue({ id: 2, subjectId: 1 });
      mockRepository.findAll.mockResolvedValue([]);
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([
          { id: 99, startTime: '08:30', endTime: '09:30' },
        ]),
      );

      await expect(service.create(1, 2)).rejects.toThrow(
        'Conflito de horário detectado',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should allow the candidatura when existing classes do not overlap', async () => {
      mockClassesRepository.findOne.mockResolvedValue({
        id: 1,
        available: true,
        subjectId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });
      mockUserRepository.findOne.mockResolvedValue({ id: 2, subjectId: 1 });
      mockRepository.findAll.mockResolvedValue([]);
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([
          { id: 99, startTime: '10:00', endTime: '11:00' },
          { id: 100, startTime: null, endTime: null },
        ]),
      );
      mockRepository.create.mockResolvedValue({ id: 1, status: 'PENDING' });

      const result = await service.create(1, 2);

      expect(result.status).toBe('PENDING');
    });

    it('should use January as semester start when the current month is before July', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
      try {
        mockClassesRepository.findOne.mockResolvedValue({
          id: 1,
          available: true,
          subjectId: 1,
        });
        mockUserRepository.findOne.mockResolvedValue({
          id: 2,
          subjectId: 1,
          substitutionLimitPerSemester: 5,
        });
        mockRepository.findAll.mockResolvedValue([]);
        mockRepository.create.mockResolvedValue({ id: 1, status: 'PENDING' });

        await service.create(1, 2);

        expect(mockRepository.count).toHaveBeenCalledWith(
          expect.objectContaining({
            createdAtGte: new Date(Date.UTC(2026, 0, 1)),
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getSubstitutionLimitStatus', () => {
    it('should return computed status for the professor themselves', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        substitutionLimitPerSemester: 4,
      });
      mockRepository.count.mockResolvedValue(1);

      const result = await service.getSubstitutionLimitStatus(2, 2);

      expect(result).toEqual({
        current: 1,
        limit: 4,
        percentage: 25,
        canApply: true,
      });
    });

    it('should default to unlimited (canApply true) when no limit is set', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        substitutionLimitPerSemester: null,
      });

      const result = await service.getSubstitutionLimitStatus(2, 2);

      expect(result).toEqual({
        current: 0,
        limit: null,
        percentage: 0,
        canApply: true,
      });
    });

    it('should allow a manager to check another professor status', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        substitutionLimitPerSemester: 4,
      });
      mockRepository.count.mockResolvedValue(0);

      await expect(
        service.getSubstitutionLimitStatus(2, 1),
      ).resolves.toBeDefined();
    });

    it('should throw ForbiddenException when a non-manager checks another professor status', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'PROFESSOR' }, schoolId: 1 }],
      });

      await expect(service.getSubstitutionLimitStatus(2, 3)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when professor does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getSubstitutionLimitStatus(2, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should report unlimited when the limit is zero', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        substitutionLimitPerSemester: 0,
      });

      const result = await service.getSubstitutionLimitStatus(2, 2);

      expect(result).toEqual({
        current: 0,
        limit: 0,
        percentage: 0,
        canApply: true,
      });
    });

    it('should report canApply false when the approved count reaches the limit', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        substitutionLimitPerSemester: 4,
      });
      mockRepository.count.mockResolvedValue(4);

      const result = await service.getSubstitutionLimitStatus(2, 2);

      expect(result).toEqual({
        current: 4,
        limit: 4,
        percentage: 100,
        canApply: false,
      });
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

      const result = await service.findAll({}, 1);

      expect(result).toEqual(requests);
    });

    it('should return only own requests for non-director', async () => {
      const requests = [{ id: 1, professorId: 2 }];

      mockDb.query.users.findFirst.mockResolvedValue({
        id: 2,
        upsUser: [{ profile: { name: 'PROFESSOR' }, schoolId: 1 }],
      });
      mockRepository.findAll.mockResolvedValue(requests);

      await service.findAll({}, 2);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ professorId: 2 }),
      );
    });

    it('should pass every supported filter through when the requester is MASTER', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [{ profile: { name: 'MASTER' }, schoolId: 1 }],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(
        {
          status: 'PENDING',
          classId: 3,
          professorId: 4,
          userId: 5,
          schoolId: 6,
          createdAfter: '2026-01-01T00:00:00.000Z',
          createdBefore: '2026-02-01T00:00:00.000Z',
          mes: '2026-03',
        },
        1,
      );

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        status: 'PENDING',
        classId: 3,
        professorId: 5,
        schoolId: 6,
        createdAtGte: new Date('2026-03-01T00:00:00.000Z'),
        createdAtLte: new Date('2026-02-01T00:00:00.000Z'),
        createdAtLt: new Date('2026-04-01T00:00:00.000Z'),
      });
    });

    it('should scope a manager without MASTER to the school of the first link', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 7 }],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll({ schoolId: 99 }, 1);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 7 }),
      );
    });

    it('should not scope a MASTER requester to a school', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [{ profile: { name: 'MASTER' }, schoolId: 7 }],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll({}, 1);

      expect(mockRepository.findAll).toHaveBeenCalledWith({});
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

    it('should throw NotFoundException when the class of the request does not exist', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 1,
        classId: 1,
        professorId: 2,
        status: 'PENDING',
      });
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));

      await expect(service.approve(1, 3)).rejects.toThrow(NotFoundException);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the class belongs to another school', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 1,
        classId: 1,
        professorId: 2,
        status: 'PENDING',
      });
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, schoolId: 2 }]),
      );
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });

      await expect(service.approve(1, 3)).rejects.toThrow(ForbiddenException);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should notify the professor by email when the request is approved', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, schoolId: 1 }]),
      );
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockTx.update.mockReturnValue(
        createDrizzleChainMock([{ ...request, status: 'APPROVED' }]),
      );
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        email: 'prof@example.com',
      });

      await service.approve(1, 3);

      expect(mockEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'prof@example.com' }),
      );
    });

    it('should skip the email when the professor has no e-mail on file', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, schoolId: 1 }]),
      );
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockTx.update.mockReturnValue(
        createDrizzleChainMock([{ ...request, status: 'APPROVED' }]),
      );
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.approve(1, 3);

      expect(mockEmail.send).not.toHaveBeenCalled();
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

    it('should throw BadRequestException when rejecting a request that is not pending', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, status: 'REJECTED' });

      await expect(service.reject(1, 3)).rejects.toThrow(BadRequestException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the class of the rejected request does not exist', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 1,
        classId: 1,
        professorId: 2,
        status: 'PENDING',
      });
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));

      await expect(service.reject(1, 3)).rejects.toThrow(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the class belongs to another school', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 1,
        classId: 1,
        professorId: 2,
        status: 'PENDING',
      });
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, schoolId: 2 }]),
      );
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });

      await expect(service.reject(1, 3)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should notify the professor by email when the request is rejected', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, schoolId: 1 }]),
      );
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 3,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockRepository.update.mockResolvedValue({
        ...request,
        status: 'REJECTED',
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 2,
        email: 'prof@example.com',
      });

      await service.reject(1, 3);

      expect(mockEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'prof@example.com' }),
      );
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

    it('should fall back to a plain cancellation when the approved class no longer exists', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'APPROVED' };
      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      mockRepository.update.mockResolvedValue({
        ...request,
        status: 'CANCELLED',
      });

      const result = await service.cancel(1, 2);

      expect(mockDb.transaction).not.toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: 'CANCELLED',
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should not release the class when another professor owns the approved enrollment', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'APPROVED' };
      mockRepository.findOne.mockResolvedValue(request);
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, enrolledById: 99 }]),
      );
      mockRepository.update.mockResolvedValue({
        ...request,
        status: 'CANCELLED',
      });

      await service.cancel(1, 2);

      expect(mockDb.transaction).not.toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: 'CANCELLED',
      });
    });

    it('should cancel a rejected request without touching the class', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'REJECTED' };
      mockRepository.findOne.mockResolvedValue(request);
      mockRepository.update.mockResolvedValue({
        ...request,
        status: 'CANCELLED',
      });

      const result = await service.cancel(1, 2);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(result.status).toBe('CANCELLED');
    });
  });
});
