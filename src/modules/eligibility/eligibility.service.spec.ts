import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityService } from './eligibility.service';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

// Motor da Fase 5 no modelo de GRUPOS por escola (definido com o
// stakeholder): grupo do professor → delay do grupo; sem grupo → delay
// padrão da escola; regra do município (interconexões + restrição da
// escola, "mais restritivo vence"); exclusão do professor vence tudo;
// escolas sem grupos mantêm o fallback da janela única.
describe('EligibilityService (Fase 5 — grupos)', () => {
  let service: EligibilityService;
  let tenantContextService: { resolve: jest.Mock };

  const mockDb = {
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
      priorityWindowHours: number | null;
      ungroupedDelayMinutes: number;
      acceptedNetworkIds: number[] | null;
    }> = {},
  ) => ({
    id,
    networkId,
    priorityWindowHours: extras.priorityWindowHours ?? null,
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EligibilityService,
        { provide: DrizzleService, useValue: { db: mockDb } },
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
      { id: 1, schoolId: 5 },
      { id: 2, schoolId: 5 },
    ]);
    mockDb.query.professorSchoolGroups.findMany.mockResolvedValue([
      {
        professorId: 10,
        groupId: 2,
        group: { id: 2, schoolId: 5, name: 'Prioridade', delayMinutes: 120 },
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

  it('se o professor estiver em mais de um grupo da escola, vale o de menor delay', async () => {
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
      { id: 1, schoolId: 5 },
    ]);
    mockDb.query.professorSchoolGroups.findMany.mockResolvedValue([
      {
        professorId: 10,
        groupId: 1,
        group: { id: 1, schoolId: 5, name: 'Lento', delayMinutes: 300 },
      },
      {
        professorId: 10,
        groupId: 2,
        group: { id: 2, schoolId: 5, name: 'Rápido', delayMinutes: 30 },
      },
    ]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(40) },
    ]);

    expect(verdict).toMatchObject({ visible: true, groupName: 'Rápido' });
  });

  it('professor fora de qualquer grupo espera o delay padrão da escola', async () => {
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
    mockDb.query.schools.findMany.mockResolvedValue([
      schoolRow(5, 1, { ungroupedDelayMinutes: 180 }),
    ]);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([
      { id: 1, schoolId: 5 },
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

  it('escola sem grupos mantém o fallback da janela única (priorityWindowHours)', async () => {
    // Professor de OUTRA rede, mas interconectada (senão a regra do
    // município bloquearia antes de chegar na janela).
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([
      { originNetworkId: 1, allowedNetworkId: 2 },
    ]);
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
          networkId: 2,
        },
      ],
    });
    mockDb.query.schools.findMany.mockResolvedValue([
      schoolRow(5, 1, { priorityWindowHours: 24 }),
    ]);

    const [duringWindow] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(60) },
    ]);
    expect(duringWindow).toMatchObject({
      visible: false,
      reason: 'PRIORITY_WINDOW',
    });

    const [afterWindow] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(25 * 60) },
    ]);
    expect(afterWindow.visible).toBe(true);

    // Vinculado à própria escola vê na hora, mesmo dentro da janela.
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [
        {
          schoolId: 5,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 1,
        },
      ],
    });
    mockDb.query.schools.findMany.mockResolvedValue([
      schoolRow(5, 1, { priorityWindowHours: 24 }),
    ]);
    const [linked] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(linked.visible).toBe(true);
  });
});
