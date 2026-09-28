import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let repository: SchoolsRepository;
  let tenantContextService: {
    resolve: jest.Mock;
    hasSchoolAccess: jest.Mock;
  };

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updatePriorityWindow: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    tenantContextService = {
      resolve: jest.fn(),
      hasSchoolAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsService,
        {
          provide: SchoolsRepository,
          useValue: mockRepository,
        },
        {
          provide: TenantContextService,
          useValue: tenantContextService,
        },
      ],
    }).compile();

    service = module.get<SchoolsService>(SchoolsService);
    repository = module.get<SchoolsRepository>(SchoolsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { name: 'School A' } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([{ id: 1, name: 'School A' }]);
      const result = await service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'School A' }]);
    });
  });

  describe('findOne', () => {
    it('should call repository.findOne', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, name: 'School A' });
      const result = await service.findOne(1);
      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'School A' });
    });
  });

  describe('update', () => {
    it('should call repository.update', async () => {
      const dto = { name: 'School Updated' } as any;
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.update(1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should call repository.remove', async () => {
      mockRepository.remove.mockResolvedValue({ id: 1, name: 'School A' });
      const result = await service.remove(1);
      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'School A' });
    });
  });

  describe('updatePriorityWindow', () => {
    beforeEach(() => {
      // mockRepository é compartilhado entre todos os testes do arquivo (não
      // resetado no beforeEach externo) - limpa aqui para as asserções de
      // "not.toHaveBeenCalled()" não pegarem chamadas de um teste anterior.
      mockRepository.updatePriorityWindow.mockClear();
      mockRepository.findOne.mockClear();
    });

    it('allows a DIRETOR with access to the school to set the window', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, name: 'School A' });
      tenantContextService.resolve.mockResolvedValue({
        userId: 10,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 1,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
          },
        ],
      });
      tenantContextService.hasSchoolAccess.mockReturnValue(true);
      mockRepository.updatePriorityWindow.mockResolvedValue({
        id: 1,
        priorityWindowHours: 4,
      });

      const result = await service.updatePriorityWindow(1, 4, 10);

      expect(repository.updatePriorityWindow).toHaveBeenCalledWith(1, 4);
      expect(result).toEqual({ id: 1, priorityWindowHours: 4 });
    });

    it('rejects when the requester has no access to the school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, name: 'School A' });
      tenantContextService.resolve.mockResolvedValue({
        userId: 99,
        isMaster: false,
        subjectId: null,
        links: [],
      });
      tenantContextService.hasSchoolAccess.mockReturnValue(false);

      await expect(
        service.updatePriorityWindow(1, 4, 99),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updatePriorityWindow).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the school does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePriorityWindow(999, 4, 10),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tenantContextService.resolve).not.toHaveBeenCalled();
    });
  });
});
