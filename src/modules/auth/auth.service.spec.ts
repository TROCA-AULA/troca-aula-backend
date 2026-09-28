import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let config: ConfigService;

  const mockUsersService = {
    findOneBy: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => (key === 'saltRounds' ? 10 : 'secret')),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    config = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('should return an access token for valid credentials', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        password: 'hashed_password',
      };
      mockUsersService.findOneBy.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.signIn('test@test.com', 'password123');

      expect(usersService.findOneBy).toHaveBeenCalledWith('test@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed_password',
      );
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result).toEqual({ access_token: 'token' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findOneBy.mockResolvedValue(null);

      await expect(
        service.signIn('test@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        password: 'hashed_password',
      };
      mockUsersService.findOneBy.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn('test@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    // P3 (problemas-conhecidos.md): migração lazy do esquema legado
    // (bcrypt sobre Base64(SHA1(senha)), como o frontend antigo enviava) —
    // login deve continuar funcionando pra contas criadas antes da correção,
    // e a senha deve ser re-hasheada no novo esquema (bcrypt direto sobre a
    // senha) na primeira vez que isso acontecer.
    it('should fall back to the legacy hash scheme and re-hash the password on success', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        password: 'hashed_legacy_password',
      };
      mockUsersService.findOneBy.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false) // novo esquema: não bate
        .mockResolvedValueOnce(true); // esquema legado: bate
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.signIn('test@test.com', 'password123');

      expect(bcrypt.compare).toHaveBeenNthCalledWith(
        1,
        'password123',
        'hashed_legacy_password',
      );
      expect(bcrypt.compare).toHaveBeenNthCalledWith(
        2,
        expect.any(String), // Base64(SHA1('password123'))
        'hashed_legacy_password',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, {
        password: 'new_hash',
      });
      expect(result).toEqual({ access_token: 'token' });
    });

    it('should throw UnauthorizedException when neither scheme matches', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        password: 'hashed_password',
      };
      mockUsersService.findOneBy.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn('test@test.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });
});
