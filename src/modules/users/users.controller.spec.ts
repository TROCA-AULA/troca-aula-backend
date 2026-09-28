import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
    assignProfile: jest.fn(),
    unassignProfile: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(10),
  };

  // Ver nota em subjects.controller.spec.ts: guards sobrescritos, pois este
  // é um teste unitário de controller que chama os métodos diretamente.
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

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
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(TenantGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

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

    // Achado de segurança real: a resposta continha o hash bcrypt de
    // password. Qualquer chamador desta rota (pública) recebia o hash de
    // volta, sem necessidade nenhuma.
    it('should never return the password hash in the response', async () => {
      const dto = { email: 'test@test.com', password: 'password123' } as any;
      mockUsersService.create.mockResolvedValue({
        id: 1,
        email: dto.email,
        password: '$2b$10$hashedvalue',
      });

      const result = await controller.create(dto);

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll without filter', async () => {
      mockUsersService.findAll.mockResolvedValue([]);
      const result = await controller.findAll({});
      expect(service.findAll).toHaveBeenCalledWith({
        schoolId: undefined,
        profileId: undefined,
      });
      expect(result).toEqual([]);
    });

    it('should forward schoolId/profileId query filters', async () => {
      mockUsersService.findAll.mockResolvedValue([]);
      await controller.findAll({ schoolId: 1, profileId: 3 });
      expect(service.findAll).toHaveBeenCalledWith({
        schoolId: 1,
        profileId: 3,
      });
    });

    // Achado de segurança real: qualquer usuário autenticado (só exige
    // AuthGuard, nenhum perfil específico) podia ver o hash bcrypt de
    // TODOS os usuários do sistema via esta rota.
    it('should strip the password hash from every user in the list', async () => {
      mockUsersService.findAll.mockResolvedValue([
        { id: 1, email: 'a@test.com', password: '$2b$10$hash1' },
        { id: 2, email: 'b@test.com', password: '$2b$10$hash2' },
      ]);

      const result = await controller.findAll({});

      expect(result).toEqual([
        { id: 1, email: 'a@test.com' },
        { id: 2, email: 'b@test.com' },
      ]);
    });
  });

  describe('assignProfile', () => {
    it('should call service.assignProfile with the caller id as approvedById', async () => {
      mockUsersService.assignProfile.mockResolvedValue({ userId: 5 });
      const req = { user: { id: 9 } };
      const result = await controller.assignProfile(
        '5',
        { profileId: 1, schoolId: 2 },
        req,
      );
      expect(service.assignProfile).toHaveBeenCalledWith(5, 1, 2, 9);
      expect(result).toEqual({ userId: 5 });
    });
  });

  describe('unassignProfile', () => {
    it('should call service.unassignProfile', async () => {
      mockUsersService.unassignProfile.mockResolvedValue({ userId: 5 });
      const result = await controller.unassignProfile('5', {
        profileId: 1,
        schoolId: 2,
      });
      expect(service.unassignProfile).toHaveBeenCalledWith(5, 1, 2);
      expect(result).toEqual({ userId: 5 });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: 1 });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });

    it('should strip the password hash', async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: 1,
        password: '$2b$10$hash',
      });
      const result = await controller.findOne('1');
      expect(result).toEqual({ id: 1 });
    });

    it('should return null as-is when the user does not exist', async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      const result = await controller.findOne('999');
      expect(result).toBeNull();
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

    it('should strip the password hash', async () => {
      mockUsersService.update.mockResolvedValue({
        id: 1,
        password: '$2b$10$hash',
      });
      const result = await controller.update('1', {});
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

    it('should strip the password hash', async () => {
      mockUsersService.remove.mockResolvedValue({
        id: 1,
        password: '$2b$10$hash',
      });
      const result = await controller.remove('1');
      expect(result).toEqual({ id: 1 });
    });
  });
});
