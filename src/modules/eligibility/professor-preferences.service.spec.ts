import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';
import { ProfessorPreferencesService } from './professor-preferences.service';

const chain = (result: unknown[] = []) => {
  const mock = createDrizzleChainMock(result);
  mock.onConflictDoNothing = jest.fn(() => mock);
  return mock;
};

// Extrai a exceção lançada por uma promise para inspecionar a mensagem.
const capture = async (promise: Promise<unknown>): Promise<any> =>
  promise.catch((error: unknown) => error);

// Preferências do professor (Fase 5): interesse POSITIVO por redes e
// exclusão NEGATIVA de escolas, usados pelo motor de elegibilidade.
describe('ProfessorPreferencesService', () => {
  let service: ProfessorPreferencesService;

  const mockDb = {
    query: {
      professorNetworkInterests: { findMany: jest.fn() },
      professorSchoolExclusions: { findMany: jest.fn() },
      networks: { findFirst: jest.fn(), findMany: jest.fn() },
      schools: { findFirst: jest.fn(), findMany: jest.fn() },
      users: { findFirst: jest.fn() },
      usersProfilesSchools: { findFirst: jest.fn() },
    },
    insert: jest.fn(() => chain()),
    delete: jest.fn(() => chain()),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([]);
    mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([]);
    mockDb.query.networks.findFirst.mockResolvedValue(null);
    mockDb.query.schools.findFirst.mockResolvedValue(null);
    mockDb.query.users.findFirst.mockResolvedValue({
      residenceNetworkId: null,
    });
    mockDb.query.usersProfilesSchools.findFirst.mockResolvedValue(undefined);
    mockDb.insert.mockImplementation(() => chain());
    mockDb.delete.mockImplementation(() => chain());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessorPreferencesService,
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
            runPrivileged: (fn: () => unknown) => fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfessorPreferencesService>(
      ProfessorPreferencesService,
    );
  });

  describe('options (D5: inclui outros municípios)', () => {
    it('devolve todas as redes e escolas, só com id, nome e rede', async () => {
      mockDb.query.networks.findMany.mockResolvedValue([
        { id: 1, name: 'Guariba' },
        { id: 2, name: 'Jaboticabal' },
      ]);
      mockDb.query.schools.findMany.mockResolvedValue([
        { id: 5, name: 'EMEF Alfa', networkId: 2 },
      ]);

      const result = await service.options();

      expect(result).toEqual({
        networks: [
          { id: 1, name: 'Guariba' },
          { id: 2, name: 'Jaboticabal' },
        ],
        schools: [{ id: 5, name: 'EMEF Alfa', networkId: 2 }],
      });
      expect(mockDb.query.schools.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: { id: true, name: true, networkId: true },
        }),
      );
    });
  });

  describe('getMine', () => {
    it('retorna interesses e exclusões do professor com os nomes resolvidos', async () => {
      mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
        {
          professorId: 10,
          networkId: 2,
          network: { id: 2, name: 'Rede Azul' },
        },
      ]);
      mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([
        { professorId: 10, schoolId: 5, school: { id: 5, name: 'Escola X' } },
      ]);

      const result = await service.getMine(10);

      expect(result).toEqual({
        networkInterests: [{ networkId: 2, networkName: 'Rede Azul' }],
        schoolExclusions: [{ schoolId: 5, schoolName: 'Escola X' }],
        residenceNetworkId: null,
        residenceNetworkName: null,
        hasContract: false,
      });
    });

    it('usa null quando a relação não vem carregada e lista vazia sem preferências', async () => {
      mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([
        { professorId: 10, networkId: 2, network: null },
      ]);
      mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([
        { professorId: 10, schoolId: 5 },
      ]);

      const result = await service.getMine(10);

      expect(result).toEqual({
        networkInterests: [{ networkId: 2, networkName: null }],
        schoolExclusions: [{ schoolId: 5, schoolName: null }],
        residenceNetworkId: null,
        residenceNetworkName: null,
        hasContract: false,
      });

      mockDb.query.professorNetworkInterests.findMany.mockResolvedValue([]);
      mockDb.query.professorSchoolExclusions.findMany.mockResolvedValue([]);

      await expect(service.getMine(10)).resolves.toEqual({
        networkInterests: [],
        schoolExclusions: [],
        residenceNetworkId: null,
        residenceNetworkName: null,
        hasContract: false,
      });
    });

    it('mostra o município onde mora e se o professor tem contrato', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ residenceNetworkId: 2 });
      mockDb.query.networks.findFirst.mockResolvedValue({
        id: 2,
        name: 'Guariba',
      });
      mockDb.query.usersProfilesSchools.findFirst.mockResolvedValue({
        userId: 10,
      });

      await expect(service.getMine(10)).resolves.toMatchObject({
        residenceNetworkId: 2,
        residenceNetworkName: 'Guariba',
        hasContract: true,
      });

      mockDb.query.networks.findFirst.mockResolvedValue(undefined);
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      await expect(service.getMine(10)).resolves.toMatchObject({
        residenceNetworkId: null,
        residenceNetworkName: null,
      });
    });
  });

  describe('addNetworkInterest', () => {
    it('lança NotFoundException quando a rede não existe', async () => {
      const error = await capture(service.addNetworkInterest(10, 2));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Rede não encontrada');
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('registra o interesse ignorando conflito de duplicidade', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 2 });
      const insert = chain([]);
      mockDb.insert.mockReturnValue(insert);

      const result = await service.addNetworkInterest(10, 2);

      expect(insert.values).toHaveBeenCalledWith({
        professorId: 10,
        networkId: 2,
      });
      expect(insert.onConflictDoNothing).toHaveBeenCalled();
      expect(result).toEqual({ networkId: 2 });
    });
  });

  describe('removeNetworkInterest', () => {
    it('remove o interesse e devolve o networkId', async () => {
      const remove = chain([]);
      mockDb.delete.mockReturnValue(remove);

      const result = await service.removeNetworkInterest(10, 2);

      expect(remove.where).toHaveBeenCalled();
      expect(result).toEqual({ networkId: 2 });
    });
  });

  describe('addSchoolExclusion', () => {
    it('lança NotFoundException quando a escola não existe', async () => {
      const error = await capture(service.addSchoolExclusion(10, 5));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Escola não encontrada');
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('registra a exclusão ignorando conflito de duplicidade', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue({ id: 5 });
      const insert = chain([]);
      mockDb.insert.mockReturnValue(insert);

      const result = await service.addSchoolExclusion(10, 5);

      expect(insert.values).toHaveBeenCalledWith({
        professorId: 10,
        schoolId: 5,
      });
      expect(insert.onConflictDoNothing).toHaveBeenCalled();
      expect(result).toEqual({ schoolId: 5 });
    });
  });

  describe('removeSchoolExclusion', () => {
    it('remove a exclusão e devolve o schoolId', async () => {
      const remove = chain([]);
      mockDb.delete.mockReturnValue(remove);

      const result = await service.removeSchoolExclusion(10, 5);

      expect(remove.where).toHaveBeenCalled();
      expect(result).toEqual({ schoolId: 5 });
    });
  });
});
