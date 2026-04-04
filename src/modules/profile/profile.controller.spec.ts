import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockProfileService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { name: 'Admin' } as any;
      mockProfileService.create.mockResolvedValue({ id: 1, ...dto });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockProfileService.findAll.mockResolvedValue([{ id: 1, name: 'Admin' }]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Admin' }]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockProfileService.findOne.mockResolvedValue({ id: 1, name: 'Admin' });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'Admin' });
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Super Admin' } as any;
      mockProfileService.update.mockResolvedValue({ id: 1, ...dto });
      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockProfileService.remove.mockResolvedValue({ id: 1, name: 'Admin' });
      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'Admin' });
    });
  });
});
