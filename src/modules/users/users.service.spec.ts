import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { EmailService } from '../email/email.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;
  let tenantContextService: TenantContextService;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignProfile: jest.fn(),
    unassignProfile: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => 10),
  };

  const mockEmailService = { send: jest.fn().mockResolvedValue(false) };
  const mockTenantContextService = {
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
    tenantContextService =
      module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRepository.update.mockReset();
    mockRepository.create.mockReset();
  });

  const link = (schoolId: number, profileName: string, profileId = 1) => ({
    schoolId,
    profileId,
    profileName,
    approvedAt: new Date(),
    networkId: 1,
  });
  const tenantOf = (links: ReturnType<typeof link>[], isMaster = false) => ({
    userId: 2,
    isMaster,
    subjectId: null,
    links,
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { email: 'test@test.com' } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('e-mail repetido vira 409 com mensagem clara (D13)', async () => {
      mockRepository.create.mockRejectedValue({ cause: { code: '23505' } });
      await expect(service.create({} as any)).rejects.toThrow(
        new ConflictException('E-mail já cadastrado'),
      );
    });

    it('município de residência inexistente vira 400', async () => {
      mockRepository.create.mockRejectedValue({ code: '23503' });
      await expect(
        service.create({ residenceNetworkId: 999 } as any),
      ).rejects.toThrow(
        new BadRequestException('Município (rede) não encontrado'),
      );
    });

    it('outros erros do banco passam adiante sem mudar', async () => {
      const boom = new Error('boom');
      mockRepository.create.mockRejectedValue(boom);
      await expect(service.create({} as any)).rejects.toBe(boom);
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should pass the filter through to repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      await service.findAll({ schoolId: 1, profileId: 3 });
      expect(repository.findAll).toHaveBeenCalledWith({
        schoolId: 1,
        profileId: 3,
      });
    });
  });

  describe('assignProfile (D22: só concede perfil abaixo do seu)', () => {
    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue({ id: 1 });
      mockRepository.assignProfile.mockResolvedValue({ userId: 1 });
    });

    it('DIRETOR vincula PROFESSOR na própria escola', async () => {
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR')]),
      );
      const result = await service.assignProfile(1, 3, 3, 9);
      expect(repository.assignProfile).toHaveBeenCalledWith(1, 3, 3, 9);
      expect(result).toEqual({ userId: 1 });
    });

    it.each([
      [4, 'MASTER'],
      [1, 'DIRETOR (igual ao dele)'],
    ])('DIRETOR NÃO concede o perfil %s (%s)', async (profileId) => {
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR')]),
      );
      await expect(service.assignProfile(1, profileId, 3, 9)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.assignProfile).not.toHaveBeenCalled();
    });

    it('o perfil de gestão em OUTRA escola não conta', async () => {
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(8, 'DIRETOR')]),
      );
      await expect(service.assignProfile(1, 3, 3, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('COORDENADOR nomeia DIRETOR, mas não MASTER', async () => {
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'COORDENADOR_MUNICIPAL', 5)]),
      );
      await expect(service.assignProfile(1, 1, 3, 9)).resolves.toBeDefined();
      await expect(service.assignProfile(1, 4, 3, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('MASTER concede qualquer perfil de escola', async () => {
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([], true));
      await expect(service.assignProfile(1, 4, 3, 9)).resolves.toBeDefined();
    });

    it('coordenador municipal não é vínculo de escola (400)', async () => {
      await expect(service.assignProfile(1, 5, 3, 9)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('perfil inexistente é recusado (400)', async () => {
      await expect(service.assignProfile(1, 77, 3, 9)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('usuário inexistente dá 404', async () => {
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([], true));
      mockRepository.findOne.mockResolvedValue(undefined);
      await expect(service.assignProfile(1, 3, 3, 9)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unassignProfile', () => {
    it('remove o vínculo quando o perfil está abaixo do de quem pede', async () => {
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR')]),
      );
      mockRepository.unassignProfile.mockResolvedValue({ userId: 1 });
      const result = await service.unassignProfile(1, 3, 3, 9);
      expect(repository.unassignProfile).toHaveBeenCalledWith(1, 3, 3);
      expect(result).toEqual({ userId: 1 });
    });

    it('AUXILIAR_ADMIN não remove um DIRETOR', async () => {
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'AUXILIAR_ADMIN', 2)]),
      );
      await expect(service.unassignProfile(1, 1, 3, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should call repository.findOne', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findOne(1);
      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should call repository.findOneBy', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });
      const result = await service.findOneBy('test@test.com');
      expect(repository.findOneBy).toHaveBeenCalledWith('test@test.com');
      expect(result).toEqual({ id: 1, email: 'test@test.com' });
    });
  });

  describe('updatePassword', () => {
    it('grava só o hash recebido', async () => {
      await service.updatePassword(4, 'hash');
      expect(repository.update).toHaveBeenCalledWith(4, { password: 'hash' });
    });
  });

  describe('updateAsRequester (D1)', () => {
    const professor = {
      id: 5,
      subjectId: null as number | null,
      upsUser: [{ schoolId: 3, profileId: 3, approvedAt: new Date() }],
    };

    beforeEach(() => {
      mockRepository.update.mockImplementation((id, data) => ({ id, ...data }));
    });

    it('a própria pessoa muda nome/telefone', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([]));
      await service.updateAsRequester(5, { phone: '1' }, 5);
      expect(repository.update).toHaveBeenCalledWith(5, { phone: '1' });
    });

    it('a própria pessoa escolhe a disciplina só se ainda não tiver', async () => {
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([]));
      mockRepository.findOne.mockResolvedValue(professor);
      await expect(
        service.updateAsRequester(5, { subjectId: 2 }, 5),
      ).resolves.toBeDefined();

      mockRepository.findOne.mockResolvedValue({ ...professor, subjectId: 2 });
      await expect(
        service.updateAsRequester(5, { subjectId: 3 }, 5),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a própria pessoa NÃO define o próprio limite de substituições', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([]));
      await expect(
        service.updateAsRequester(5, { substitutionLimitPerSemester: 9 }, 5),
      ).rejects.toThrow(ForbiddenException);
    });

    it('gestor da escola do professor muda disciplina e limite (D6)', async () => {
      mockRepository.findOne.mockResolvedValue({ ...professor, subjectId: 2 });
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR')]),
      );
      await service.updateAsRequester(
        5,
        { subjectId: 3, substitutionLimitPerSemester: 4 },
        2,
      );
      expect(repository.update).toHaveBeenCalledWith(5, {
        subjectId: 3,
        substitutionLimitPerSemester: 4,
      });
    });

    it('gestor de OUTRA escola não altera ninguém', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(8, 'DIRETOR')]),
      );
      await expect(
        service.updateAsRequester(5, { phone: '0' }, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('gestor não altera conta MASTER, mesmo na mesma escola', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 1,
        upsUser: [{ schoolId: 3, profileId: 4, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR')]),
      );
      await expect(
        service.updateAsRequester(1, { phone: '0' }, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('MASTER altera qualquer conta', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([], true));
      await expect(
        service.updateAsRequester(5, { name: 'X' }, 1),
      ).resolves.toEqual({ id: 5, name: 'X' });
    });

    it('vínculo ainda NÃO aprovado não dá poder ao gestor', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 3, profileId: 3, approvedAt: null }],
      });
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR')]),
      );
      await expect(
        service.updateAsRequester(5, { phone: '0' }, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('usuário inexistente dá 404', async () => {
      mockRepository.findOne.mockResolvedValue(undefined);
      await expect(service.updateAsRequester(9, {}, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('e-mail repetido vira 409', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([]));
      mockRepository.update.mockRejectedValue({ code: '23505' });
      await expect(
        service.updateAsRequester(5, { email: 'x@y' }, 5),
      ).rejects.toThrow(ConflictException);
    });

    it('o professor define o próprio município de residência; inexistente vira 400', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([]));
      mockRepository.update.mockResolvedValueOnce({
        id: 5,
        residenceNetworkId: 2,
      });
      await expect(
        service.updateAsRequester(5, { residenceNetworkId: 2 }, 5),
      ).resolves.toEqual({ id: 5, residenceNetworkId: 2 });

      mockRepository.update.mockRejectedValueOnce({ cause: { code: '23503' } });
      await expect(
        service.updateAsRequester(5, { residenceNetworkId: 999 }, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('outros erros do banco passam adiante', async () => {
      mockRepository.findOne.mockResolvedValue(professor);
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([]));
      const boom = new Error('boom');
      mockRepository.update.mockRejectedValue(boom);
      await expect(
        service.updateAsRequester(5, { email: 'x@y' }, 5),
      ).rejects.toBe(boom);
    });
  });

  describe('remove', () => {
    it('should call repository.remove', async () => {
      mockRepository.remove.mockResolvedValue({ id: 1 });
      const result = await service.remove(1);
      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('resetPassword', () => {
    it('allows MASTER to reset any account and returns the temp password once', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        name: 'Ana',
        email: 'ana@x.com',
        upsUser: [],
      });
      mockTenantContextService.resolve.mockResolvedValue({
        userId: 1,
        isMaster: true,
        subjectId: null,
        links: [],
      });

      const result = await service.resetPassword(5, 1);

      expect(result.tempPassword).toEqual(expect.any(String));
      expect(result.tempPassword.length).toBeGreaterThanOrEqual(8);
      expect(repository.update).toHaveBeenCalledWith(5, {
        password: expect.any(String),
      });
      // Sem SMTP: não saiu e-mail, o gestor repassa a senha.
      expect(result.emailSent).toBe(false);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ana@x.com',
          text: expect.stringContaining(result.tempPassword),
        }),
      );
      // A senha devolvida é a crua; o que vai para o banco é o hash.
      expect(mockRepository.update.mock.calls[0][1].password).not.toBe(
        result.tempPassword,
      );
    });

    it('avisa quando a senha foi enviada por e-mail', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        name: 'Ana',
        email: 'ana@x.com',
        upsUser: [],
      });
      mockTenantContextService.resolve.mockResolvedValue(tenantOf([], true));
      mockEmailService.send.mockResolvedValueOnce(true);

      await expect(service.resetPassword(5, 1)).resolves.toMatchObject({
        emailSent: true,
      });
    });

    it('allows a manager of a school shared with the target', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 3, profileId: 3, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue({
        userId: 2,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 3,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      });

      const result = await service.resetPassword(5, 2);

      expect(result.tempPassword).toEqual(expect.any(String));
    });

    it('denies a manager without a shared school', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 9, profileId: 3, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue({
        userId: 2,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 3,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      });

      await expect(service.resetPassword(5, 2)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('denies a secretary resetting the director of the same school', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 3, profileId: 1, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'AUXILIAR_ADMIN', 2)]),
      );

      await expect(service.resetPassword(5, 2)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('denies a director resetting another director, even if that person is a professor elsewhere', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [
          { schoolId: 3, profileId: 3, approvedAt: new Date() },
          { schoolId: 8, profileId: 1, approvedAt: new Date() },
        ],
      });
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'DIRETOR', 1)]),
      );

      await expect(service.resetPassword(5, 2)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows a municipal coordinator to reset a director of the network', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 5,
        upsUser: [{ schoolId: 3, profileId: 1, approvedAt: new Date() }],
      });
      mockTenantContextService.resolve.mockResolvedValue(
        tenantOf([link(3, 'COORDENADOR_MUNICIPAL', 5)]),
      );

      const result = await service.resetPassword(5, 2);

      expect(result.tempPassword).toEqual(expect.any(String));
    });

    it('throws NotFoundException when the target does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(undefined);

      await expect(service.resetPassword(99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
