import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { AuthGuard } from '../auth/auth.guard';

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
    it('should call service.findAll', async () => {
      const params = { userId: 1 } as any;
      mockClassesService.findAll.mockResolvedValue([]);
      const result = await controller.findAll(params);
      expect(service.findAll).toHaveBeenCalledWith(params);
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
    it('should call service.update', async () => {
      const dto = { registredById: 2 } as any;
      mockClassesService.update.mockResolvedValue({ id: 1 });
      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockClassesService.remove.mockResolvedValue({ id: 1 });
      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });
});
