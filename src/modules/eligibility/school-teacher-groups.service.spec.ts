import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import {
  NetworkInterconnectionsService,
  SchoolTeacherGroupsService,
} from './school-teacher-groups.service';

// Cadeia fluente do Drizzle (insert/update/delete) usada pelo service.
// O helper compartilhado não expõe onConflictDoNothing, então completamos.
const chain = (result: unknown[] = []) => {
  const mock = createDrizzleChainMock(result);
  mock.onConflictDoNothing = jest.fn(() => mock);
  return mock;
};

// Extrai a exceção lançada por uma promise para inspecionar a mensagem.
const capture = async (promise: Promise<unknown>): Promise<any> =>
  promise.catch((error: unknown) => error);

describe('SchoolTeacherGroupsService (Fase 5 — grupos por escola)', () => {
  let service: SchoolTeacherGroupsService;

  const tenant = {
    userId: 1,
    isMaster: false,
    subjectId: null,
    links: [],
  };

  const mockTenantContext = {
    resolve: jest.fn(),
    hasSchoolAccess: jest.fn(),
  };

  const mockTx = {
    delete: jest.fn(() => chain()),
    insert: jest.fn(() => chain()),
  };

  const mockDb = {
    query: {
      schools: { findFirst: jest.fn() },
      schoolTeacherGroups: { findFirst: jest.fn(), findMany: jest.fn() },
      networkInterconnections: { findMany: jest.fn() },
      users: { findMany: jest.fn() },
      networks: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    insert: jest.fn(() => chain()),
    update: jest.fn(() => chain()),
    delete: jest.fn(() => chain()),
    transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTenantContext.resolve.mockResolvedValue(tenant);
    mockTenantContext.hasSchoolAccess.mockReturnValue(true);

    mockDb.query.schools.findFirst.mockResolvedValue(null);
    mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue(null);
    mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([]);
    mockDb.query.users.findMany.mockResolvedValue([]);
    mockDb.query.networks.findFirst.mockResolvedValue(null);
    mockDb.query.networks.findMany.mockResolvedValue([]);

    mockTx.delete.mockImplementation(() => chain());
    mockTx.insert.mockImplementation(() => chain());
    mockDb.insert.mockImplementation(() => chain());
    mockDb.update.mockImplementation(() => chain());
    mockDb.delete.mockImplementation(() => chain());
    mockDb.transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolTeacherGroupsService,
        { provide: DrizzleService, useValue: { db: mockDb } },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<SchoolTeacherGroupsService>(
      SchoolTeacherGroupsService,
    );
  });

  describe('get', () => {
    it('lança ForbiddenException quando o solicitante não é gestor da escola', async () => {
      mockTenantContext.hasSchoolAccess.mockReturnValue(false);

      const error = await capture(service.get(5, 1));

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toContain(
        'Você só pode configurar a prioridade de vagas da sua escola',
      );
      expect(mockTenantContext.resolve).toHaveBeenCalledWith(1);
      expect(mockTenantContext.hasSchoolAccess).toHaveBeenCalledWith(
        tenant,
        5,
        MANAGER_PROFILES,
      );
      expect(mockDb.query.schools.findFirst).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando a escola não existe', async () => {
      const error = await capture(service.get(5, 1));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Escola não encontrada');
    });

    it('retorna grupos, interconexões e fallbacks retrocompatíveis', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue({
        id: 5,
        networkId: 1,
        priorityWindowHours: null,
        ungroupedDelayMinutes: 30,
        acceptedNetworkIds: null,
      });
      mockDb.query.schoolTeacherGroups.findMany.mockResolvedValue([
        {
          id: 10,
          name: 'Professores da casa',
          delayMinutes: 0,
          members: [{ professorId: 7 }],
        },
        { id: 11, name: 'Novatos', delayMinutes: 60 },
      ]);
      mockDb.query.networkInterconnections.findMany.mockResolvedValue([
        { originNetworkId: 1, allowedNetworkId: 2 },
        { originNetworkId: 1, allowedNetworkId: 3 },
      ]);

      const result = await service.get(5, 1);

      expect(result).toEqual({
        schoolId: 5,
        ungroupedDelayMinutes: 30,
        fallbackPriorityWindowHours: null,
        allowedNetworkIds: [2, 3],
        acceptedNetworkIds: null,
        groups: [
          {
            id: 10,
            name: 'Professores da casa',
            delayMinutes: 0,
            professorIds: [7],
          },
          { id: 11, name: 'Novatos', delayMinutes: 60, professorIds: [] },
        ],
      });
      expect(mockDb.query.schoolTeacherGroups.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() }),
      );
    });

    it('preserva priorityWindowHours e acceptedNetworkIds quando definidos', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue({
        id: 5,
        networkId: 2,
        priorityWindowHours: 24,
        ungroupedDelayMinutes: 0,
        acceptedNetworkIds: [3],
      });

      const result = await service.get(5, 1);

      expect(result.fallbackPriorityWindowHours).toBe(24);
      expect(result.acceptedNetworkIds).toEqual([3]);
      expect(result.groups).toEqual([]);
      expect(result.allowedNetworkIds).toEqual([]);
    });
  });

  describe('createGroup', () => {
    it('lança ForbiddenException quando o solicitante não é gestor da escola', async () => {
      mockTenantContext.hasSchoolAccess.mockReturnValue(false);

      const dto = { name: 'A', delayMinutes: 0 };
      const error = await capture(service.createGroup(5, dto, 1));

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando já existe grupo com o mesmo nome', async () => {
      mockDb.insert.mockReturnValue(chain([]));

      const error = await capture(
        service.createGroup(5, { name: 'Duplicado', delayMinutes: 10 }, 1),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(
        'Já existe um grupo com esse nome nesta escola',
      );
    });

    it('cria o grupo e devolve o gabarito atualizado da escola', async () => {
      const getSpy = jest
        .spyOn(service, 'get')
        .mockResolvedValue({ schoolId: 5 } as never);
      const insert = chain([{ id: 10 }]);
      mockDb.insert.mockReturnValue(insert);

      const result = await service.createGroup(
        5,
        { name: 'Professores da casa', delayMinutes: 15 },
        1,
      );

      expect(insert.values).toHaveBeenCalledWith({
        schoolId: 5,
        name: 'Professores da casa',
        delayMinutes: 15,
      });
      expect(insert.onConflictDoNothing).toHaveBeenCalled();
      expect(getSpy).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual({ schoolId: 5 });
    });
  });

  describe('updateGroup', () => {
    it('lança ForbiddenException quando o solicitante não é gestor da escola', async () => {
      mockTenantContext.hasSchoolAccess.mockReturnValue(false);

      const error = await capture(service.updateGroup(5, 9, { name: 'X' }, 1));

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(mockDb.query.schoolTeacherGroups.findFirst).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando o grupo não existe', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue(null);

      const error = await capture(service.updateGroup(5, 9, { name: 'X' }, 1));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Grupo não encontrado nesta escola');
    });

    it('lança NotFoundException quando o grupo pertence a outra escola', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 6,
      });

      const error = await capture(service.updateGroup(5, 9, { name: 'X' }, 1));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Grupo não encontrado nesta escola');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando o novo nome já existe na escola', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      mockDb.update.mockReturnValue(chain([]));

      const error = await capture(
        service.updateGroup(5, 9, { name: 'Duplicado' }, 1),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(
        'Já existe um grupo com esse nome nesta escola',
      );
    });

    it('atualiza apenas o nome quando delayMinutes não é informado', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      const update = chain([{ id: 9 }]);
      mockDb.update.mockReturnValue(update);
      const getSpy = jest
        .spyOn(service, 'get')
        .mockResolvedValue({ schoolId: 5 } as never);

      await service.updateGroup(5, 9, { name: 'Novo nome' }, 1);

      expect(update.set).toHaveBeenCalledWith({ name: 'Novo nome' });
      expect(getSpy).toHaveBeenCalledWith(5, 1);
    });

    it('atualiza apenas o delay quando o nome não é informado', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      const update = chain([{ id: 9 }]);
      mockDb.update.mockReturnValue(update);
      jest.spyOn(service, 'get').mockResolvedValue({ schoolId: 5 } as never);

      await service.updateGroup(5, 9, { delayMinutes: 45 }, 1);

      expect(update.set).toHaveBeenCalledWith({ delayMinutes: 45 });
    });

    it('atualiza nome e delay quando os dois são informados', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      const update = chain([{ id: 9 }]);
      mockDb.update.mockReturnValue(update);
      jest.spyOn(service, 'get').mockResolvedValue({ schoolId: 5 } as never);

      await service.updateGroup(5, 9, { name: 'Ambos', delayMinutes: 5 }, 1);

      expect(update.set).toHaveBeenCalledWith({
        name: 'Ambos',
        delayMinutes: 5,
      });
    });
  });

  describe('removeGroup', () => {
    it('lança NotFoundException quando o grupo não existe', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue(null);

      await expect(service.removeGroup(5, 9, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('remove o grupo e devolve o gabarito atualizado da escola', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      const remove = chain([]);
      mockDb.delete.mockReturnValue(remove);
      const getSpy = jest
        .spyOn(service, 'get')
        .mockResolvedValue({ schoolId: 5 } as never);

      const result = await service.removeGroup(5, 9, 1);

      expect(remove.where).toHaveBeenCalled();
      expect(getSpy).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual({ schoolId: 5 });
    });
  });

  describe('setMembers', () => {
    it('lança NotFoundException quando o grupo não pertence à escola', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 6,
      });

      await expect(service.setMembers(5, 9, [1], 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockDb.query.users.findMany).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando algum professor não existe', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      mockDb.query.users.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const error = await capture(service.setMembers(5, 9, [1, 2, 3], 1));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Um ou mais professores não existem');
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('substitui os membros do grupo validando os professores existentes', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      mockDb.query.users.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const remove = chain([]);
      const insert = chain([]);
      mockTx.delete.mockReturnValue(remove);
      mockTx.insert.mockReturnValue(insert);
      const getSpy = jest
        .spyOn(service, 'get')
        .mockResolvedValue({ schoolId: 5 } as never);

      const result = await service.setMembers(5, 9, [2, 1, 2, 1], 1);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(remove.where).toHaveBeenCalled();
      expect(insert.values).toHaveBeenCalledWith([
        { professorId: 2, groupId: 9 },
        { professorId: 1, groupId: 9 },
      ]);
      expect(insert.onConflictDoNothing).toHaveBeenCalled();
      expect(getSpy).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual({ schoolId: 5 });
    });

    it('aceita lista vazia sem consultar professores nem inserir membros', async () => {
      mockDb.query.schoolTeacherGroups.findFirst.mockResolvedValue({
        id: 9,
        schoolId: 5,
      });
      const remove = chain([]);
      mockTx.delete.mockReturnValue(remove);
      jest.spyOn(service, 'get').mockResolvedValue({ schoolId: 5 } as never);

      await service.setMembers(5, 9, [], 1);

      expect(mockDb.query.users.findMany).not.toHaveBeenCalled();
      expect(remove.where).toHaveBeenCalled();
      expect(mockTx.insert).not.toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    const schoolRow = (networkId = 1) => ({
      id: 5,
      networkId,
      priorityWindowHours: null,
      ungroupedDelayMinutes: 0,
      acceptedNetworkIds: null,
    });

    it('lança ForbiddenException quando o solicitante não é gestor da escola', async () => {
      mockTenantContext.hasSchoolAccess.mockReturnValue(false);

      const error = await capture(
        service.updateSettings(5, { ungroupedDelayMinutes: 10 }, 1),
      );

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(mockDb.query.schools.findFirst).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando a escola não existe', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue(null);

      const error = await capture(
        service.updateSettings(5, { ungroupedDelayMinutes: 10 }, 1),
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Escola não encontrada');
    });

    it('lança BadRequestException quando aceita rede fora das interconexões do município', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue(schoolRow(1));
      mockDb.query.networkInterconnections.findMany.mockResolvedValue([
        { originNetworkId: 1, allowedNetworkId: 2 },
      ]);

      const error = await capture(
        service.updateSettings(5, { acceptedNetworkIds: [2, 3] }, 1),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain(
        'A escola só pode aceitar redes que o próprio município já interconectou',
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('persiste delay padrão e redes aceitas permitidas', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue(schoolRow(1));
      mockDb.query.networkInterconnections.findMany.mockResolvedValue([
        { originNetworkId: 1, allowedNetworkId: 2 },
      ]);
      const update = chain([]);
      mockDb.update.mockReturnValue(update);
      const getSpy = jest
        .spyOn(service, 'get')
        .mockResolvedValue({ schoolId: 5 } as never);

      const result = await service.updateSettings(
        5,
        { ungroupedDelayMinutes: 15, acceptedNetworkIds: [2] },
        1,
      );

      expect(update.set).toHaveBeenCalledWith({
        ungroupedDelayMinutes: 15,
        acceptedNetworkIds: [2],
      });
      expect(update.where).toHaveBeenCalled();
      expect(getSpy).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual({ schoolId: 5 });
    });

    it('converte lista vazia de redes aceitas em null (aceita todas as permitidas)', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue(schoolRow(1));
      const update = chain([]);
      mockDb.update.mockReturnValue(update);
      jest.spyOn(service, 'get').mockResolvedValue({ schoolId: 5 } as never);

      await service.updateSettings(5, { acceptedNetworkIds: [] }, 1);

      expect(
        mockDb.query.networkInterconnections.findMany,
      ).not.toHaveBeenCalled();
      expect(update.set).toHaveBeenCalledWith({ acceptedNetworkIds: null });
    });

    it('não inclui campos ausentes no update', async () => {
      mockDb.query.schools.findFirst.mockResolvedValue(schoolRow(1));
      const update = chain([]);
      mockDb.update.mockReturnValue(update);
      jest.spyOn(service, 'get').mockResolvedValue({ schoolId: 5 } as never);

      await service.updateSettings(5, {}, 1);

      expect(update.set).toHaveBeenCalledWith({});
    });
  });
});

describe('NetworkInterconnectionsService (Fase 5 — interconexões entre redes)', () => {
  let service: NetworkInterconnectionsService;

  const mockTx = {
    delete: jest.fn(() => chain()),
    insert: jest.fn(() => chain()),
  };

  const mockDb = {
    query: {
      networks: { findFirst: jest.fn(), findMany: jest.fn() },
      networkInterconnections: { findMany: jest.fn() },
    },
    transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb.query.networks.findFirst.mockResolvedValue(null);
    mockDb.query.networks.findMany.mockResolvedValue([]);
    mockDb.query.networkInterconnections.findMany.mockResolvedValue([]);
    mockTx.delete.mockImplementation(() => chain());
    mockTx.insert.mockImplementation(() => chain());
    mockDb.transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkInterconnectionsService,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<NetworkInterconnectionsService>(
      NetworkInterconnectionsService,
    );
  });

  describe('get', () => {
    it('lança NotFoundException quando a rede não existe', async () => {
      const error = await capture(service.get(1));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Rede não encontrada');
      expect(
        mockDb.query.networkInterconnections.findMany,
      ).not.toHaveBeenCalled();
    });

    it('retorna as redes interconectadas com nome (null quando sem relação carregada)', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 1 });
      mockDb.query.networkInterconnections.findMany.mockResolvedValue([
        {
          originNetworkId: 1,
          allowedNetworkId: 2,
          allowedNetwork: { id: 2, name: 'Rede Azul' },
        },
        { originNetworkId: 1, allowedNetworkId: 3, allowedNetwork: null },
      ]);

      const result = await service.get(1);

      expect(result).toEqual({
        networkId: 1,
        interconnections: [
          { networkId: 2, networkName: 'Rede Azul' },
          { networkId: 3, networkName: null },
        ],
      });
    });

    it('retorna lista vazia quando a rede não interconecta com ninguém', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 1 });

      const result = await service.get(1);

      expect(result).toEqual({ networkId: 1, interconnections: [] });
    });
  });

  describe('replace', () => {
    it('lança NotFoundException quando a rede não existe', async () => {
      const error = await capture(
        service.replace(1, { allowedNetworkIds: [2] }),
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Rede não encontrada');
    });

    it('lança BadRequestException quando a rede tenta se interconectar com ela mesma', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 1 });

      const error = await capture(
        service.replace(1, { allowedNetworkIds: [1, 1] }),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(
        'Uma rede não pode se interconectar com ela mesma',
      );
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando uma das redes informadas não existe', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 1 });
      mockDb.query.networks.findMany.mockResolvedValue([{ id: 2 }]);

      const error = await capture(
        service.replace(1, { allowedNetworkIds: [2, 3] }),
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Uma ou mais redes informadas não existem');
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('remove todas as interconexões quando a lista é vazia', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 1 });
      const remove = chain([]);
      mockTx.delete.mockReturnValue(remove);
      jest
        .spyOn(service, 'get')
        .mockResolvedValue({ networkId: 1, interconnections: [] });

      const result = await service.replace(1, { allowedNetworkIds: [] });

      expect(mockDb.query.networks.findMany).not.toHaveBeenCalled();
      expect(remove.where).toHaveBeenCalled();
      expect(mockTx.insert).not.toHaveBeenCalled();
      expect(result).toEqual({ networkId: 1, interconnections: [] });
    });

    it('substitui as interconexões deduplicando redes repetidas', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue({ id: 1 });
      mockDb.query.networks.findMany.mockResolvedValue([{ id: 2 }, { id: 3 }]);
      const remove = chain([]);
      const insert = chain([]);
      mockTx.delete.mockReturnValue(remove);
      mockTx.insert.mockReturnValue(insert);
      jest
        .spyOn(service, 'get')
        .mockResolvedValue({ networkId: 1, interconnections: [] });

      await service.replace(1, { allowedNetworkIds: [2, 3, 2] });

      expect(insert.values).toHaveBeenCalledWith([
        { originNetworkId: 1, allowedNetworkId: 2 },
        { originNetworkId: 1, allowedNetworkId: 3 },
      ]);
      expect(remove.where).toHaveBeenCalled();
    });
  });
});
