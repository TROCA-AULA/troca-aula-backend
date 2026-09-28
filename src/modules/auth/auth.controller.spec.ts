import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
    changePassword: jest.fn(),
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
    })
      // change-password é protegida por AuthGuard (JwtService/ConfigService
      // não fazem parte do teste unitário do controller).
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  describe('changePassword', () => {
    it('should call authService.changePassword with the requester id', async () => {
      const dto = { currentPassword: 'old-pass', newPassword: 'new-pass-123' };
      mockAuthService.changePassword.mockResolvedValue({
        message: 'Senha alterada com sucesso',
      });

      const result = await controller.changePassword(dto, {
        user: { id: 7 },
      } as any);

      expect(service.changePassword).toHaveBeenCalledWith(
        7,
        'old-pass',
        'new-pass-123',
      );
      expect(result).toEqual({ message: 'Senha alterada com sucesso' });
    });
  });
});
