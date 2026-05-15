import { Test, TestingModule } from '@nestjs/testing';
import { SwapRequestsController } from './swap-requests.controller';
import { SwapRequestsService } from './swap-requests.service';

describe('SwapRequestsController', () => {
  let controller: SwapRequestsController;
  let service: SwapRequestsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };

  const mockRequest = {
    user: { id: 1 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SwapRequestsController],
      providers: [{ provide: SwapRequestsService, useValue: mockService }],
    }).compile();

    controller = module.get<SwapRequestsController>(SwapRequestsController);
    service = module.get<SwapRequestsService>(SwapRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a swap request', async () => {
      const dto = { classId: 1, targetId: 2 };
      const result = { id: 1, status: 'PENDING' };

      mockService.create = jest.fn().mockResolvedValue(result);

      expect(await controller.create(dto, mockRequest)).toBe(result);
      expect(mockService.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('findAll', () => {
    it('should return all swap requests', async () => {
      const query = { status: 'PENDING' };
      const result = [{ id: 1 }, { id: 2 }];

      mockService.findAll = jest.fn().mockResolvedValue(result);

      expect(await controller.findAll(query, mockRequest)).toBe(result);
      expect(mockService.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a single swap request', async () => {
      const result = { id: 1, status: 'PENDING' };

      mockService.findOne = jest.fn().mockResolvedValue(result);

      expect(await controller.findOne('1')).toBe(result);
      expect(mockService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('accept', () => {
    it('should accept a swap request', async () => {
      const result = { id: 1, status: 'APPROVED' };

      mockService.accept = jest.fn().mockResolvedValue(result);

      expect(await controller.accept('1', mockRequest)).toBe(result);
      expect(mockService.accept).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('reject', () => {
    it('should reject a swap request', async () => {
      const result = { id: 1, status: 'REJECTED' };

      mockService.reject = jest.fn().mockResolvedValue(result);

      expect(await controller.reject('1', mockRequest)).toBe(result);
      expect(mockService.reject).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('cancel', () => {
    it('should cancel a swap request', async () => {
      const result = { id: 1, status: 'CANCELLED' };

      mockService.cancel = jest.fn().mockResolvedValue(result);

      expect(await controller.cancel('1', mockRequest)).toBe(result);
      expect(mockService.cancel).toHaveBeenCalledWith(1, 1);
    });
  });
});
