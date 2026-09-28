import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityService } from './eligibility.service';
import { DrizzleService } from '../../database/drizzle.service';
import { TenantContextService } from '../auth/tenant/tenant-context.service';

// Motor da Fase 5 (Design Doc Seção 9). Testa a resolução de níveis
// ("o mais restritivo vence"), interconexão direcional, interesse,
// exclusão do professor e o fallback retrocompatível para
// Schools.priorityWindowHours.
describe('EligibilityService', () => {
  let service: EligibilityService;
  let tenantContextService: { resolve: jest.Mock };

  const mockDb = {
    query: {
      professorSchoolExclusions: { findMany: jest.fn() },
      professorNetworkInterests: { findMany: jest.fn() },
      schools: { findMany: jest.fn() },
      schoolPriorityTiers: { findMany: jest.fn() },
      networkInterconnections: { findMany: jest.fn() },
    },
  };

  const HOUR_MS = 60 * 60 * 1000;
  const NOW = new Date('2026-10-01T12:00:00Z');
  const createdAgo = (minutes: number) =>
    new Date(NOW.getTime() - minutes * 60 * 1000);

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    tenantContextService = { resolve: jest.fn() };
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [],
    });
    mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([]);
    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([]);
    mockDb.query.schools.findMany.mockResolvedValue([]);
    mockDb.query.schoolPriorityTiers.findMany.mockResolvedValue([]);
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

  const schoolRow = (
    id: number,
    networkId: number,
    priorityWindowHours: number | null = null,
  ) => ({ id, networkId, priorityWindowHours });

  it('bloqueia vaga de escola que o próprio professor excluiu (vence qualquer critério)', async () => {
    tenantContextService.resolve.mockResolvedValue({
      userId: 10,
      isMaster: false,
      subjectId: 1,
      links: [],
    });
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([
      { professorId: 10, schoolId: 5 },
    ]);

    const verdict = await service
      .assertCanApply(10, {
        schoolId: 5,
        createdAt: createdAgo(1000),
      })
      .catch((error) => error);

    expect(verdict).toBeInstanceOf(ForbiddenException);
    expect(verdict.message).toContain('Você excluiu esta escola');
  });

  it('professor vinculado à escola vê imediatamente (fallback sem tiers)', async () => {
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
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1, 24)]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);

    expect(verdict).toMatchObject({ visible: true, tierScope: 'ESCOLA' });
  });

  it('professor externo fica oculto durante a janela legada e aparece depois', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1, 24)]);

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
    expect(afterWindow).toMatchObject({ visible: true, tierScope: 'GERAL' });
  });

  it('com tiers: colega da mesma rede espera o atraso do nível REDE', async () => {
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
      schoolRow(5, 1),
      schoolRow(6, 1),
    ]);
    mockDb.query.schoolPriorityTiers.findMany.mockResolvedValue([
      {
        schoolId: 5,
        order: 1,
        delayMinutes: 0,
        scopeType: 'ESCOLA',
        restrictedNetworkIds: null,
      },
      {
        schoolId: 5,
        order: 2,
        delayMinutes: 120,
        scopeType: 'REDE',
        restrictedNetworkIds: null,
      },
      {
        schoolId: 5,
        order: 3,
        delayMinutes: 240,
        scopeType: 'GERAL',
        restrictedNetworkIds: null,
      },
    ]);

    const [tooEarly] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(60) },
    ]);
    expect(tooEarly).toMatchObject({
      visible: false,
      reason: 'PRIORITY_WINDOW',
    });

    const [opened] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(180) },
    ]);
    expect(opened).toMatchObject({ visible: true, tierScope: 'REDE' });
  });

  it('nível REDE_INTERCONECTADA_INTERESSADA exige interconexão direcional + interesse', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
      { professorId: 10, networkId: 2 },
    ]);
    mockDb.query.schoolPriorityTiers.findMany.mockResolvedValue([
      {
        schoolId: 5,
        order: 1,
        delayMinutes: 0,
        scopeType: 'REDE_INTERCONECTADA_INTERESSADA',
        restrictedNetworkIds: null,
      },
    ]);

    // Sem interconexão cadastrada (1 -> 2), não qualifica.
    const [noInterconnection] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(noInterconnection.visible).toBe(false);

    mockDb.query.networkInterconnections.findMany.mockResolvedValue([
      { originNetworkId: 1, allowedNetworkId: 2 },
    ]);
    const [interested] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(interested).toMatchObject({
      visible: true,
      tierScope: 'REDE_INTERCONECTADA_INTERESSADA',
    });
  });

  it('escola não pode abrir mais que a rede: restrictedNetworkIds fora da interconexão não qualifica', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
      { professorId: 10, networkId: 2 },
    ]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([
      { originNetworkId: 1, allowedNetworkId: 2 },
    ]);
    mockDb.query.schoolPriorityTiers.findMany.mockResolvedValue([
      {
        schoolId: 5,
        order: 1,
        delayMinutes: 0,
        scopeType: 'REDE_INTERCONECTADA_INTERESSADA',
        // Escola restringe a uma rede que a própria rede interconectou com
        // OUTRA (3) — o interesse do professor é na 2, então não entra.
        restrictedNetworkIds: [3],
      },
      {
        schoolId: 5,
        order: 2,
        delayMinutes: 60,
        scopeType: 'GERAL',
        restrictedNetworkIds: null,
      },
    ]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(verdict.visible).toBe(false);

    const [afterGeneralDelay] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(90) },
    ]);
    expect(afterGeneralDelay).toMatchObject({
      visible: true,
      tierScope: 'GERAL',
    });
  });

  it('professor sem vínculo nenhum entra apenas pelo nível GERAL', async () => {
    mockDb.query.schools.findMany.mockResolvedValue([schoolRow(5, 1)]);
    mockDb.query.schoolPriorityTiers.findMany.mockResolvedValue([
      {
        schoolId: 5,
        order: 1,
        delayMinutes: 0,
        scopeType: 'ESCOLA',
        restrictedNetworkIds: null,
      },
      {
        schoolId: 5,
        order: 2,
        delayMinutes: 30,
        scopeType: 'GERAL',
        restrictedNetworkIds: null,
      },
    ]);

    const [before] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(10) },
    ]);
    expect(before.visible).toBe(false);

    const [after] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(45) },
    ]);
    expect(after).toMatchObject({ visible: true, tierScope: 'GERAL' });
  });

  it('vínculo aprovado conta como prioridade no nível REDE_INTERCONECTADA_INTERESSADA', async () => {
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
      schoolRow(5, 1),
      schoolRow(9, 2),
    ]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([
      { originNetworkId: 1, allowedNetworkId: 2 },
    ]);
    mockDb.query.schoolPriorityTiers.findMany.mockResolvedValue([
      {
        schoolId: 5,
        order: 1,
        delayMinutes: 0,
        scopeType: 'REDE_INTERCONECTADA_INTERESSADA',
        restrictedNetworkIds: null,
      },
    ]);

    const [verdict] = await service.evaluateMany(10, [
      { schoolId: 5, createdAt: createdAgo(1) },
    ]);
    expect(verdict).toMatchObject({
      visible: true,
      tierScope: 'REDE_INTERCONECTADA_INTERESSADA',
    });
  });
});
