import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should call authService.signIn', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      mockAuthService.signIn.mockResolvedValue({ access_token: 'token' });

      const result = await controller.signIn(dto);

      expect(service.signIn).toHaveBeenCalledWith(dto.email, dto.password);
      expect(result).toEqual({ access_token: 'token' });
    });
  });
});
