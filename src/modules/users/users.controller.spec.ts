import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;
  let config: ConfigService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(10),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    config = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should hash password and call service.create', async () => {
      const dto = { email: 'test@test.com', password: 'password123' } as any;
      mockUsersService.create.mockResolvedValue({ id: 1, email: dto.email });

      const result = await controller.create(dto);

      expect(config.get).toHaveBeenCalledWith('saltRounds');
      expect(service.create).toHaveBeenCalled();
      // Verificamos que a senha enviada para o serviço é diferente da original (foi hasheada)
      expect(mockUsersService.create.mock.calls[0][0].password).not.toBe(
        'password123',
      );
      expect(result).toEqual({ id: 1, email: dto.email });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockUsersService.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: 1 });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' } as any;
      mockUsersService.update.mockResolvedValue({ id: 1 });
      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockUsersService.remove.mockResolvedValue({ id: 1 });
      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });
});
