import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityService } from './eligibility.service';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

// Motor da Fase 5 no modelo de GRUPOS DE PRIORIDADE por escola (definido
// com o stakeholder): grupo do professor → tempo do grupo (prioridade 0
// primeiro); escola sem grupos → todos na hora; escola com grupos → quem
// está sem grupo é o último; regra do município (interconexões + restrição
// da escola, "mais restritivo vence"); exclusão do professor vence tudo;
// escola que não dá para ler → vaga escondida (falha fechada, D4).
describe('EligibilityService (Fase 5 — grupos)', () => {
  let service: EligibilityService;
  let tenantContextService: { resolve: jest.Mock };

  const mockDb = {
    select: jest.fn(),
    query: {
      professorSchoolExclusions: { findMany: jest.fn() },
      professorNetworkInterests: { findMany: jest.fn() },
      professorSchoolGroups: { findMany: jest.fn() },
      schools: { findMany: jest.fn() },
      schoolTeacherGroups: { findMany: jest.fn() },
      networkInterconnections: { findMany: jest.fn() },
    },
  };

  const NOW = new Date('2026-10-01T12:00:00Z');
  const createdAgo = (minutes: number) =>
    new Date(NOW.getTime() - minutes * 60 * 1000);

  const schoolRow = (
    id: number,
    networkId: number,
    extras: Partial<{
      ungroupedDelayMinutes: number;
      acceptedNetworkIds: number[] | null;
    }> = {},
  ) => ({
    id,
    networkId,
    ungroupedDelayMinutes: extras.ungroupedDelayMinutes ?? 0,
    acceptedNetworkIds: extras.acceptedNetworkIds ?? null,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    tenantContextService = {
      resolve: jest.fn().mockResolvedValue({
        userId: 10,
        isMaster: false,
        subjectId: 1,
        links: [],
      }),
    };
    mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([]);
    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([]);
    mockDb.query.professorSchoolGroups.findMany.mockResolvedValue([]);
    mockDb.query.schools.findMany.mockResolvedValue([]);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([]);
    // Município de residência (só lido quando o professor não tem vínculo).
    mockDb.select.mockReturnValue(
      createDrizzleChainMock([{ residenceNetworkId: null }]),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EligibilityService,
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
            runPrivileged: (fn: () => unknown) => fn(),
          },
        },
        { provide: TenantContextService, useValue: tenantContextService },
      ],
    }).compile();

    service = module.get(EligibilityService);
  });

  afterEach(() => jest.useRealTimers());

  it('exclusão do professor vence qualquer critério', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([
      { professorId: 10, schoolId: 5 },
    ]);

    const verdict = await service
      .assertCanApply(10, { schoolId: 5, createdAt: createdAgo(1000) })
      .catch((error) => error);

    expect(verdict).toBeInstanceOf(ForbiddenException);
    expect(verdict.message).toContain('Você excluiu esta escola');
  });

  it('professor no grupo vê depois do delay do grupo (0 = imediato)', async () => {
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [
        {
          schoolId: 6,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 1,
        },
      ],
    });
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([
      { id: 1, schoolId: 5, delayMinutes: 0 },
      { id: 2, schoolId: 5, delayMinutes: 120 },
    ]);
    mockDb.query.professorSchoolGroups.findMany.mockResolvedValue([
      {
        professorId: 10,
        groupId: 2,
        group: {
          id: 2,
          schoolId: 5,
          name: 'Prioridade',
          priority: 1,
          delayMinutes: 120,
        },
      },
    ]);

    const [tooEarly] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(60) },
    ]);
    expect(tooEarly).toMatchObject({
      visible: false,
      reason: 'PRIORITY_WINDOW',
    });
    expect(tooEarly.message).toContain('Prioridade');

    const [opened] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(180) },
    ]);
    expect(opened).toMatchObject({ visible: true, groupName: 'Prioridade' });
  });

  it('se o professor estiver em mais de um grupo da escola, vale o de maior prioridade (menor número)', async () => {
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [
        {
          schoolId: 6,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 1,
        },
      ],
    });
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([
      { id: 1, schoolId: 5, delayMinutes: 300 },
      { id: 2, schoolId: 5, delayMinutes: 30 },
      { id: 3, schoolId: 5, delayMinutes: 30 },
    ]);
    mockDb.query.professorSchoolGroups.findMany.mockResolvedValue([
      {
        professorId: 10,
        groupId: 1,
        group: {
          id: 1,
          schoolId: 5,
          name: 'Lento',
          priority: 2,
          delayMinutes: 300,
        },
      },
      {
        professorId: 10,
        groupId: 3,
        group: {
          id: 3,
          schoolId: 5,
          name: 'Empate lento',
          priority: 0,
          delayMinutes: 45,
        },
      },
      {
        professorId: 10,
        groupId: 2,
        group: {
          id: 2,
          schoolId: 5,
          name: 'Rápido',
          priority: 0,
          delayMinutes: 30,
        },
      },
    ]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(40) },
    ]);

    expect(verdict).toMatchObject({ visible: true, groupName: 'Rápido' });
  });

  const professorDaRede1 = {
    userId: 10,
    isMaster: false,
    subjectId: 1,
    links: [
      {
        schoolId: 6,
        profileId: 3,
        profileName: 'PROFESSOR',
        approvedAt: new Date(),
        networkId: 1,
      },
    ],
  };

  it('escola SEM grupos: todo professor que passou na regra de rede vê na hora', async () => {
    tenantContextService.resolve.mockResolvedValue(professorDaRede1);
    mockDb.query.schools.findMany.mockResolvedValue([
      schoolRow(5, 1, { ungroupedDelayMinutes: 999 }),
    ]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(0) },
    ]);

    expect(verdict).toEqual({ visible: true });
  });

  it('escola COM grupos: quem está sem grupo é o último (espera o grupo mais demorado)', async () => {
    tenantContextService.resolve.mockResolvedValue(professorDaRede1);
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([
      { id: 1, schoolId: 5, delayMinutes: 0 },
      { id: 2, schoolId: 5, delayMinutes: 90 },
    ]);

    const [before] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(80) },
    ]);
    expect(before).toMatchObject({ visible: false, reason: 'PRIORITY_WINDOW' });
    expect(before.message).toContain('sem grupo');

    const [after] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(95) },
    ]);
    expect(after.visible).toBe(true);
  });

  it('a espera extra de quem está sem grupo só vale se for maior que a do último grupo', async () => {
    tenantContextService.resolve.mockResolvedValue(professorDaRede1);
    mockDb.query.schools.findMany.mockResolvedValue([
      schoolRow(5, 1, { ungroupedDelayMinutes: 180 }),
    ]);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([
      { id: 1, schoolId: 5, delayMinutes: 60 },
    ]);

    const [before] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(170) },
    ]);
    expect(before.visible).toBe(false);

    const [after] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(190) },
    ]);
    expect(after.visible).toBe(true);
  });

  it('escola que não foi encontrada (ex.: escondida pelo RLS) NÃO libera a vaga (D4)', async () => {
    tenantContextService.resolve.mockResolvedValue(professorDaRede1);
    mockDb.query.schools.findMany.mockResolvedValue([]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 77, createdAt: createdAgo(10_000) },
    ]);

    expect(verdict).toMatchObject({ visible: false, reason: 'NETWORK' });
  });

  it('professor sem vínculo nem interesse não vê vaga de rede nenhuma (D4)', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(10_000) },
    ]);

    expect(verdict).toMatchObject({ visible: false, reason: 'NETWORK' });
  });

  it('regra do município: rede só mostra para redes interconectadas (vínculo ou interesse)', async () => {
    // Rede 1 interconecta com a 2.
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([
      { originNetworkId: 1, allowedNetworkId: 2 },
    ]);

    // Professor vinculado à rede 3 (não interconectada) → não vê.
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [
        {
          schoolId: 9,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 3,
        },
      ],
    });
    const [outsider] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(outsider).toMatchObject({ visible: false, reason: 'NETWORK' });

    // Professor com interesse na rede 2 → vê.
    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
      { professorId: 10, networkId: 2 },
    ]);
    const [interested] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(interested.visible).toBe(true);
  });

  it('sem contrato em escola nenhuma, o município onde mora conta como o dele', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([
      schoolRow(5, 1),
      schoolRow(6, 2),
    ]);
    mockDb.select.mockReturnValue(
      createDrizzleChainMock([{ residenceNetworkId: 1 }]),
    );

    const [ownCity, otherCity] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
      { schoolId: 6, createdAt: createdAgo(1) },
    ]);

    expect(ownCity.visible).toBe(true);
    expect(otherCity).toMatchObject({ visible: false, reason: 'NETWORK' });
  });

  it('contrato prevalece sobre residência: com vínculo, a cidade onde mora é ignorada', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.select.mockReturnValue(
      createDrizzleChainMock([{ residenceNetworkId: 1 }]),
    );
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [
        {
          schoolId: 9,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 3,
        },
      ],
    });

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);

    expect(verdict).toMatchObject({ visible: false, reason: 'NETWORK' });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('escola pode restringir mais que a rede, nunca menos', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([
      // Rede interconecta com 2 e 3, mas a escola só aceita a 3.
      schoolRow(5, 1, { acceptedNetworkIds: [3] }),
    ]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([
      { originNetworkId: 1, allowedNetworkId: 2 },
      { originNetworkId: 1, allowedNetworkId: 3 },
    ]);
    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
      { professorId: 10, networkId: 2 },
    ]);

    const [blocked] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(blocked).toMatchObject({ visible: false, reason: 'NETWORK' });

    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
      { professorId: 10, networkId: 3 },
    ]);
    const [allowed] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(allowed.visible).toBe(true);
  });
});
