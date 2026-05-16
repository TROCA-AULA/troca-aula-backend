import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentRequestsService } from './enrollment-requests.service';
import { EnrollmentRequestsRepository } from './enrollment-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { ClassesRepository } from '../classes/classes.repository';
import { PrismaService } from '../../prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('EnrollmentRequestsService', () => {
  let service: EnrollmentRequestsService;
  let repository: EnrollmentRequestsRepository;
  let userRepository: UsersRepository;
  let classesRepository: ClassesRepository;
  let prisma: PrismaService;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockClassesRepository = {
    findOne: jest.fn(),
  };

  const mockPrisma = {
    users: {
      findUnique: jest.fn(),
    },
    classes: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    enrollmentRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentRequestsService,
        { provide: EnrollmentRequestsRepository, useValue: mockRepository },
        { provide: UsersRepository, useValue: mockUserRepository },
        { provide: ClassesRepository, useValue: mockClassesRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EnrollmentRequestsService>(EnrollmentRequestsService);
    repository = module.get<EnrollmentRequestsRepository>(EnrollmentRequestsRepository);
    userRepository = module.get<UsersRepository>(UsersRepository);
    classesRepository = module.get<ClassesRepository>(ClassesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      mockPrisma.enrollmentRequest.findFirst.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ id: 1, classId: 1, professorId: 2, status: 'PENDING' });

      const result = await service.create(1, 2);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
    });

    it('should throw NotFoundException when class not found', async () => {
      mockClassesRepository.findOne.mockResolvedValue(null);
      mockPrisma.enrollmentRequest.findFirst.mockResolvedValue(null);

      await expect(service.create(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when class not available', async () => {
      mockClassesRepository.findOne.mockResolvedValue({ id: 1, available: false });

      await expect(service.create(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already has pending request', async () => {
      const classData = { id: 1, available: true, subjectId: 1 };
      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockPrisma.enrollmentRequest.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.create(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when subject does not match', async () => {
      const classData = { id: 1, available: true, subjectId: 1 };
      const professor = { id: 2, subjectId: 2 };

      mockClassesRepository.findOne.mockResolvedValue(classData);
      mockUserRepository.findOne.mockResolvedValue(professor);
      mockPrisma.enrollmentRequest.findFirst.mockResolvedValue(null);

      await expect(service.create(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return enrollment requests for director', async () => {
      const director = { id: 1 };
      const requests = [{ id: 1 }, { id: 2 }];

      mockUserRepository.findOne.mockResolvedValue(director);
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }],
      });
      mockRepository.findAll.mockResolvedValue(requests);

      const result = await service.findAll({}, 1);

      expect(result).toEqual(requests);
    });

    it('should return only own requests for non-director', async () => {
      const professor = { id: 2 };
      const requests = [{ id: 1, professorId: 2 }];

      mockUserRepository.findOne.mockResolvedValue(professor);
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 2,
        upsUser: [{ profile: { name: 'PROFESSOR' }, schoolId: 1 }],
      });
      mockRepository.findAll.mockResolvedValue(requests);

      const result = await service.findAll({}, 2);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ professorId: 2 }) }),
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
    it('should approve enrollment request and link professor', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      const director = { id: 3, upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }] };
      const classData = { id: 1, schoolId: 1, subjectId: 1 };

      mockRepository.findOne.mockResolvedValue(request);
      mockPrisma.users.findUnique.mockResolvedValue(director);
      mockPrisma.classes.findUnique.mockResolvedValue(classData);
      mockRepository.update.mockResolvedValue({ ...request, status: 'APPROVED' });

      const result = await service.approve(1, 3);

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.classes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { enrolledById: 2, available: false },
      });
    });

    it('should throw BadRequestException when not pending', async () => {
      const request = { id: 1, status: 'APPROVED' };
      mockRepository.findOne.mockResolvedValue(request);

      await expect(service.approve(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject enrollment request', async () => {
      const request = { id: 1, classId: 1, status: 'PENDING' };
      const director = { id: 3, upsUser: [{ profile: { name: 'DIRETOR' }, schoolId: 1 }] };
      const classData = { id: 1, schoolId: 1 };

      mockRepository.findOne.mockResolvedValue(request);
      mockPrisma.users.findUnique.mockResolvedValue(director);
      mockPrisma.classes.findUnique.mockResolvedValue(classData);
      mockRepository.update.mockResolvedValue({ ...request, status: 'REJECTED' });

      const result = await service.reject(1, 3);

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('cancel', () => {
    it('should cancel own pending request', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'PENDING' };
      mockRepository.findOne.mockResolvedValue(request);
      mockRepository.update.mockResolvedValue({ ...request, status: 'CANCELLED' });

      const result = await service.cancel(1, 2);

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ForbiddenException when not own request', async () => {
      const request = { id: 1, professorId: 2 };
      mockRepository.findOne.mockResolvedValue(request);

      await expect(service.cancel(1, 3)).rejects.toThrow(ForbiddenException);
    });

    it('should release class when cancelling approved enrollment', async () => {
      const request = { id: 1, classId: 1, professorId: 2, status: 'APPROVED' };
      const classData = { id: 1, enrolledById: 2 };

      mockRepository.findOne.mockResolvedValue(request);
      mockPrisma.classes.findUnique.mockResolvedValue(classData);
      mockRepository.update.mockResolvedValue({ ...request, status: 'CANCELLED' });

      await service.cancel(1, 2);

      expect(mockPrisma.classes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { enrolledById: null, available: true },
      });
    });
  });
});