import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let repository: SchoolsRepository;
  let tenantContextService: {
    assertCanManageNetwork: jest.Mock;
  };

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tenantContextService = {
      assertCanManageNetwork: jest.fn().mockResolvedValue({}),
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
    it('confere que quem cria gerencia a rede e cria a escola', async () => {
      const dto = { name: 'School A', networkId: 2 } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto, 7);
      expect(tenantContextService.assertCanManageNetwork).toHaveBeenCalledWith(
        7,
        2,
      );
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('não cria quando a rede não é de quem pede (coordenador de outra rede)', async () => {
      tenantContextService.assertCanManageNetwork.mockRejectedValue(
        new ForbiddenException(),
      );
      await expect(
        service.create({ name: 'X', networkId: 9 } as any, 7),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
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
    it('confere a rede atual da escola e atualiza', async () => {
      const dto = { name: 'School Updated' } as any;
      mockRepository.findOne.mockResolvedValue({ id: 1, networkId: 2 });
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.update(1, dto, 7);
      expect(tenantContextService.assertCanManageNetwork).toHaveBeenCalledWith(
        7,
        2,
      );
      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('ao mudar a escola de rede, confere também a rede de destino', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, networkId: 2 });
      await service.update(1, { networkId: 3 }, 7);
      expect(tenantContextService.assertCanManageNetwork).toHaveBeenCalledWith(
        7,
        3,
      );
    });

    it('lança NotFoundException quando a escola não existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.update(99, {} as any, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
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
});
