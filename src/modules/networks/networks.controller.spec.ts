import { Test, TestingModule } from '@nestjs/testing';
import { NetworksController } from './networks.controller';
import { NetworksService } from './networks.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('NetworksController', () => {
  let controller: NetworksController;
  let service: NetworksService;

  const mockNetworksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NetworksController],
      providers: [{ provide: NetworksService, useValue: mockNetworksService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<NetworksController>(NetworksController);
    service = module.get<NetworksService>(NetworksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { name: 'Rede Municipal X' } as any;
      mockNetworksService.create.mockResolvedValue({ id: 1, ...dto });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockNetworksService.findAll.mockResolvedValue([{ id: 1, name: 'Rede X' }]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Rede X' }]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockNetworksService.findOne.mockResolvedValue({ id: 1, name: 'Rede X' });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'Rede X' });
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Rede Renomeada' } as any;
      mockNetworksService.update.mockResolvedValue({ id: 1, ...dto });
      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });
});
