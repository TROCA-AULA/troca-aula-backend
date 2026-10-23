import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesRepository } from './classes.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { EmailService } from '../email/email.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('ClassesService', () => {
  let service: ClassesService;
  let repository: ClassesRepository;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getCoverageCounts: jest.fn(),
  };

  // A visibilidade em si é testada no eligibility.service.spec; aqui
  // garantimos que a listagem DELEGA para o motor e respeita o veredito.
  const mockEligibility = {
    evaluateMany: jest.fn(),
  };

  const mockEmail = {
    send: jest.fn(),
    sendMany: jest.fn(),
  };

  let mockDb: {
    select: jest.Mock;
    update: jest.Mock;
    query: {
      users: { findFirst: jest.Mock; findMany: jest.Mock };
      schools: { findMany: jest.Mock };
    };
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
      query: {
        users: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        schools: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: ClassesRepository, useValue: mockRepository },
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
            runPrivileged: (fn: () => unknown) => fn(),
          },
        },
        // TenantContextService real (não mockado): só depende do
        // DrizzleService acima, então os testes controlam seu
        // comportamento mockando mockDb.query.users.findFirst, igual ao
        // que a classe realmente chama em produção.
        TenantContextService,
        { provide: EligibilityService, useValue: mockEligibility },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    repository = module.get<ClassesRepository>(ClassesRepository);

    // Por padrão, tudo visível; testes específicos sobrescrevem.
    mockEligibility.evaluateMany.mockImplementation(
      (_professorId: number, items: unknown[]) =>
        Promise.resolve(items.map(() => ({ visible: true }))),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.create', async () => {
      const dto = { schoolId: 1, subjectId: 1, createdByd: 1 } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('notifica por e-mail os professores da matéria vinculados à escola', async () => {
      const dto = { schoolId: 1, subjectId: 1, createdByd: 1 } as any;
      mockRepository.create.mockResolvedValue({ id: 1, ...dto });
      mockDb.query.users.findMany.mockResolvedValue([
        {
          id: 9,
          name: 'Maria',
          email: 'maria@escola.com',
          upsUser: [{ schoolId: 1 }],
        },
        {
          id: 10,
          name: 'Sem Vínculo',
          email: 'externo@escola.com',
          upsUser: [],
        },
      ]);

      await service.create(dto);

      expect(mockEmail.sendMany).toHaveBeenCalledWith([
        expect.objectContaining({ to: 'maria@escola.com' }),
      ]);
    });
  });

  describe('findAll', () => {
    it('gestor vê as escolas que gerencia (todas, não só a primeira)', async () => {
      const params = { userId: 1 };
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 10,
            profileId: 1,
            approvedAt: new Date(),
            profile: { name: 'DIRETOR' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(repository.findAll).toHaveBeenCalledWith({
        schoolIds: [10],
        available: undefined,
      });
    });

    const coordinatorUser = {
      id: 1,
      upsUser: [
        {
          schoolId: 10,
          profileId: 1,
          approvedAt: new Date(),
          profile: { name: 'DIRETOR' },
        },
        {
          schoolId: 11,
          profileId: 2,
          approvedAt: new Date(),
          profile: { name: 'AUXILIAR_ADMIN' },
        },
      ],
    };

    it('gestor de várias escolas pode filtrar por uma delas', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(coordinatorUser);
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll({ userId: 1, schoolId: 11, available: true });

      expect(repository.findAll).toHaveBeenCalledWith({
        schoolIds: [11],
        available: true,
      });
    });

    it('gestor que pede escola que NÃO gerencia recebe as dele', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(coordinatorUser);
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll({ userId: 1, schoolId: 99 });

      expect(repository.findAll).toHaveBeenCalledWith({
        schoolIds: [10, 11],
        available: undefined,
      });
    });

    const professorUser = (subjectId: number | null) => ({
      id: 1,
      subjectId,
      upsUser: [
        {
          schoolId: 10,
          profileId: 3,
          approvedAt: new Date(),
          profile: { name: 'PROFESSOR' },
        },
      ],
    });

    it('professor sem disciplina cadastrada não vê aula nenhuma', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(professorUser(null));
      mockRepository.findAll.mockResolvedValue([
        { id: 1, subjectId: 5, schoolId: 10, school: { id: 10 } },
      ]);

      await expect(service.findAll({ userId: 1 })).resolves.toEqual([]);
    });

    it('professor NÃO vê aula que já aconteceu, exceto a que é dele (D11)', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(professorUser(5));
      const past = new Date(Date.now() - 86_400_000);
      const future = new Date(Date.now() + 86_400_000);
      mockRepository.findAll.mockResolvedValue([
        { id: 1, subjectId: 5, schoolId: 10, statededAt: past, school: {} },
        { id: 2, subjectId: 5, schoolId: 10, statededAt: future, school: {} },
        {
          id: 3,
          subjectId: 5,
          schoolId: 10,
          statededAt: past,
          enrolledById: 1,
          school: {},
        },
      ]);

      const result = await service.findAll({ userId: 1 });

      expect(result.map((item) => item.id)).toEqual([2, 3]);
    });

    it('completa o nome da escola de outro município (escondida pelo RLS) (D4)', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(professorUser(5));
      mockRepository.findAll.mockResolvedValue([
        { id: 1, subjectId: 5, schoolId: 50, school: null },
        {
          id: 2,
          subjectId: 5,
          schoolId: 10,
          school: { id: 10, name: 'Já veio' },
        },
      ]);
      mockDb.query.schools.findMany.mockResolvedValue([
        { id: 50, name: 'EMEF Vizinha', networkId: 3 },
      ]);

      const result = await service.findAll({ userId: 1 });

      expect(result).toEqual([
        {
          id: 1,
          subjectId: 5,
          schoolId: 50,
          school: { id: 50, name: 'EMEF Vizinha', networkId: 3 },
        },
        {
          id: 2,
          subjectId: 5,
          schoolId: 10,
          school: { id: 10, name: 'Já veio' },
        },
      ]);
    });

    // Achado real ao validar o guia de simulação contra Postgres: antes
    // desta correção, MASTER caía no mesmo ramo de DIRETOR/AUXILIAR_ADMIN e
    // ficava escopado ao primeiro vínculo dele - mesmo tendo um vínculo
    // formal em alguma escola (ex.: bootstrap), o MASTER precisa continuar
    // vendo aulas de QUALQUER escola/rede.
    it('does not scope MASTER to their own primary school link', async () => {
      const params = { userId: 1 };
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 1,
            profileId: 4,
            approvedAt: new Date(),
            profile: { name: 'MASTER' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(repository.findAll).toHaveBeenCalledWith(params);
    });

    it('should call repository.findAll with original params if profile is PROFESSOR', async () => {
      const params = { userId: 1 };
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 10,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(repository.findAll).toHaveBeenCalledWith(params);
    });

    it('should call repository.findAll with original params if no userId', async () => {
      const params = {};
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll(params);

      expect(repository.findAll).toHaveBeenCalledWith(params);
    });

    // Achado real relatado pelo usuário: a listagem não filtrava por
    // disciplina, só a candidatura. Corrigido para o professor não ver
    // vagas que ele nunca poderia aceitar de qualquer forma.
    it('filters out classes whose subject does not match the professor subjectId', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        subjectId: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([
        {
          id: 1,
          subjectId: 5,
          schoolId: 10,
          createdAt: new Date(),
          school: { priorityWindowHours: null },
        },
        {
          id: 2,
          subjectId: 9,
          schoolId: 10,
          createdAt: new Date(),
          school: { priorityWindowHours: null },
        },
      ]);

      const result = await service.findAll({ userId: 1 });

      expect(result).toEqual([
        {
          id: 1,
          subjectId: 5,
          schoolId: 10,
          createdAt: expect.any(Date),
          school: { priorityWindowHours: null },
        },
      ]);
    });

    // A janela/prioridade em si é responsabilidade do motor da Fase 5
    // (eligibility.service.spec); aqui garantimos que a listagem delega e
    // remove o que o motor marcou como invisível.
    it('delegates visibility to the eligibility engine and drops invisible classes', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        subjectId: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
          },
        ],
      });
      const hiddenClass = {
        id: 1,
        subjectId: 5,
        schoolId: 99,
        createdAt: new Date(),
        school: { priorityWindowHours: 4 },
      };
      const visibleClass = {
        id: 2,
        subjectId: 5,
        schoolId: 10,
        createdAt: new Date(),
        school: { priorityWindowHours: 4 },
      };
      mockRepository.findAll.mockResolvedValue([hiddenClass, visibleClass]);
      mockEligibility.evaluateMany.mockResolvedValue([
        { visible: false, reason: 'PRIORITY_WINDOW' },
        { visible: true, tierScope: 'ESCOLA' },
      ]);

      const result = await service.findAll({ userId: 1 });

      expect(mockEligibility.evaluateMany).toHaveBeenCalledWith(1, [
        { schoolId: 99, createdAt: hiddenClass.createdAt },
        { schoolId: 10, createdAt: visibleClass.createdAt },
      ]);
      expect(result).toEqual([visibleClass]);
    });

    it('shows a class from an unlinked school once the priority window has elapsed', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        subjectId: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
          },
        ],
      });
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      mockRepository.findAll.mockResolvedValue([
        {
          id: 1,
          subjectId: 5,
          schoolId: 99,
          createdAt: fiveHoursAgo, // janela de 4h já passou
          school: { priorityWindowHours: 4 },
        },
      ]);

      const result = await service.findAll({ userId: 1 });

      expect(result).toHaveLength(1);
    });

    it('always shows a class from a school the professor is linked to, regardless of the priority window', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        subjectId: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
          },
        ],
      });
      mockRepository.findAll.mockResolvedValue([
        {
          id: 1,
          subjectId: 5,
          schoolId: 10, // mesma escola do vínculo do professor
          createdAt: new Date(), // criada agora
          school: { priorityWindowHours: 4 },
        },
      ]);

      const result = await service.findAll({ userId: 1 });

      expect(result).toHaveLength(1);
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

  describe('update', () => {
    it('should call repository.update when requester has manager access to the class school', async () => {
      const dto = { registredById: 2 } as any;
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 1,
            approvedAt: new Date(),
            profile: { name: 'DIRETOR' },
          },
        ],
      });
      mockRepository.update.mockResolvedValue({ id: 1, ...dto });

      const result = await service.update(1, dto, 5);

      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('should throw ForbiddenException when requester has no approved link to the class school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        upsUser: [
          {
            schoolId: 99,
            profileId: 1,
            approvedAt: new Date(),
            profile: { name: 'DIRETOR' },
          },
        ],
      });

      await expect(service.update(1, {} as any, 5)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when class does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(1, {} as any, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should call repository.remove when requester has manager access to the class school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        upsUser: [
          {
            schoolId: 10,
            profileId: 4,
            approvedAt: new Date(),
            profile: { name: 'MASTER' },
          },
        ],
      });
      mockRepository.remove.mockResolvedValue({ id: 1 });

      const result = await service.remove(1, 5);

      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });

    it('should throw ForbiddenException when requester has no approved link to the class school', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, schoolId: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({ id: 5, upsUser: [] });

      await expect(service.remove(1, 5)).rejects.toThrow(ForbiddenException);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getCoverageStats', () => {
    it('should return "baixo" risco when coverage rate is >= 0.7', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 10,
        cobertas: 8,
      });

      const result = await service.getCoverageStats({ schoolId: 1 });

      expect(result).toEqual({
        totalVagas: 10,
        cobertas: 8,
        taxaCobertura: 0.8,
        nivel: 'baixo',
      });
    });

    it('should return "medio" risco when coverage rate is between 0.4 and 0.7', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 10,
        cobertas: 5,
      });

      const result = await service.getCoverageStats({});

      expect(result.nivel).toBe('medio');
      expect(result.taxaCobertura).toBe(0.5);
    });

    it('should return "alto" risco when coverage rate is below 0.4', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 10,
        cobertas: 2,
      });

      const result = await service.getCoverageStats({});

      expect(result.nivel).toBe('alto');
      expect(result.taxaCobertura).toBe(0.2);
    });

    it('should return "alto" risco and taxaCobertura=0 when there is no data (totalVagas=0)', async () => {
      mockRepository.getCoverageCounts.mockResolvedValue({
        totalVagas: 0,
        cobertas: 0,
      });

      const result = await service.getCoverageStats({});

      expect(result).toEqual({
        totalVagas: 0,
        cobertas: 0,
        taxaCobertura: 0,
        nivel: 'alto',
      });
    });
  });
});
