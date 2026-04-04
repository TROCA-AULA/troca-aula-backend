import { Test, TestingModule } from '@nestjs/testing';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

describe('SubjectsController', () => {
  let controller: SubjectsController;
  let service: SubjectsService;

  const mockSubjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectsController],
      providers: [
        {
          provide: SubjectsService,
          useValue: mockSubjectsService,
        },
      ],
    }).compile();

    controller = module.get<SubjectsController>(SubjectsController);
    service = module.get<SubjectsService>(SubjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { name: 'Math' } as any;
      mockSubjectsService.create.mockResolvedValue({ id: 1, ...dto });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockSubjectsService.findAll.mockResolvedValue([{ id: 1, name: 'Math' }]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Math' }]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockSubjectsService.findOne.mockResolvedValue({ id: 1, name: 'Math' });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'Math' });
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Math Updated' } as any;
      mockSubjectsService.update.mockResolvedValue({ id: 1, ...dto });
      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockSubjectsService.remove.mockResolvedValue({ id: 1, name: 'Math' });
      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'Math' });
    });
  });
});
