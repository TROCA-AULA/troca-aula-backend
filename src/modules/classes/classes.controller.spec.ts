import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: ClassesService;

  const mockClassesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    enroll: jest.fn(),
    unenroll: jest.fn(),
    getCoverageStats: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: mockClassesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(TenantGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<ClassesController>(ClassesController);
    service = module.get<ClassesService>(ClassesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { schoolId: 1 } as any;
      mockClassesService.create.mockResolvedValue({ id: 1 });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findAll', () => {
    // Achado real (bug corrigido): userId não pode mais vir do cliente na
    // query string - a tela real de "Aulas Disponíveis" nunca mandava esse
    // parâmetro, então o filtro de matéria/janela de prioridade nunca era
    // aplicado nela. Agora vem sempre de req.user.id, sobrescrevendo
    // qualquer valor que o cliente tenha mandado.
    it('always overrides userId with the authenticated requester id', async () => {
      const params = { schoolId: 5, userId: 999 } as any;
      const req = { user: { id: 1 } };
      mockClassesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(params, req);

      expect(service.findAll).toHaveBeenCalledWith({ schoolId: 5, userId: 1 });
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockClassesService.findOne.mockResolvedValue({ id: 1 });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update', () => {
    it('should call service.update with the requester id from the request', async () => {
      const dto = { registredById: 2 } as any;
      const req = { user: { id: 7 } };
      mockClassesService.update.mockResolvedValue({ id: 1 });
      const result = await controller.update('1', dto, req);
      expect(service.update).toHaveBeenCalledWith(1, dto, 7);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('remove', () => {
    it('should call service.remove with the requester id from the request', async () => {
      const req = { user: { id: 7 } };
      mockClassesService.remove.mockResolvedValue({ id: 1 });
      const result = await controller.remove('1', req);
      expect(service.remove).toHaveBeenCalledWith(1, 7);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('getCoverageStats', () => {
    it('should call service.getCoverageStats with the query params', async () => {
      const params = { schoolId: 1 } as any;
      const stats = {
        totalVagas: 10,
        cobertas: 8,
        taxaCobertura: 0.8,
        nivel: 'baixo',
      };
      mockClassesService.getCoverageStats.mockResolvedValue(stats);

      const result = await controller.getCoverageStats(params);

      expect(service.getCoverageStats).toHaveBeenCalledWith(params);
      expect(result).toEqual(stats);
    });
  });
});
