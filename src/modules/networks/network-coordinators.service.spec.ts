import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';
import { NetworkCoordinatorsService } from './network-coordinators.service';

const chain = (result: unknown[] = []) => {
  const mock = createDrizzleChainMock(result);
  mock.onConflictDoNothing = jest.fn(() => mock);
  return mock;
};

// Coordenador municipal: vínculo pessoa <-> rede, gerido só pelo MASTER.
describe('NetworkCoordinatorsService', () => {
  let service: NetworkCoordinatorsService;

  const mockDb = {
    query: {
      userNetworkLinks: { findMany: jest.fn() },
      users: { findFirst: jest.fn() },
      networks: { findFirst: jest.fn() },
    },
    insert: jest.fn(() => chain()),
    delete: jest.fn(() => chain()),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.query.users.findFirst.mockResolvedValue({ id: 7 });
    mockDb.query.networks.findFirst.mockResolvedValue({ id: 2 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkCoordinatorsService,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get(NetworkCoordinatorsService);
  });

  describe('findAll', () => {
    it('lista os vínculos com nome da pessoa e da rede, ignorando conta apagada', async () => {
      const approvedAt = new Date('2026-10-01');
      mockDb.query.userNetworkLinks.findMany.mockResolvedValue([
        {
          userId: 7,
          networkId: 2,
          approvedAt,
          user: { id: 7, name: 'Lia', email: 'lia@x', phone: '1' },
          network: { id: 2, name: 'Jaboticabal' },
        },
        { userId: 8, networkId: 2, approvedAt, user: null, network: null },
        {
          userId: 9,
          networkId: 3,
          approvedAt: null,
          user: { id: 9, name: 'Rui', email: 'rui@x', phone: '2' },
          network: null,
        },
      ]);

      const result = await service.findAll();

      expect(result).toEqual([
        {
          userId: 7,
          userName: 'Lia',
          userEmail: 'lia@x',
          userPhone: '1',
          networkId: 2,
          networkName: 'Jaboticabal',
          approvedAt,
        },
        {
          userId: 9,
          userName: 'Rui',
          userEmail: 'rui@x',
          userPhone: '2',
          networkId: 3,
          networkName: null,
          approvedAt: null,
        },
      ]);
    });
  });

  describe('create', () => {
    it('cria o vínculo já aprovado pelo MASTER', async () => {
      const insert = chain([{ userId: 7, networkId: 2 }]);
      mockDb.insert.mockReturnValue(insert);

      const result = await service.create(7, 2, 1);

      expect(insert.values).toHaveBeenCalledWith({
        userId: 7,
        networkId: 2,
        approvedAt: expect.any(Date),
        approvedById: 1,
      });
      expect(result).toEqual({ userId: 7, networkId: 2 });
    });

    it('recusa vínculo repetido', async () => {
      mockDb.insert.mockReturnValue(chain([]));
      await expect(service.create(7, 2, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('usuário inexistente dá 404', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      await expect(service.create(7, 2, 1)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('rede inexistente dá 404', async () => {
      mockDb.query.networks.findFirst.mockResolvedValue(undefined);
      await expect(service.create(7, 2, 1)).rejects.toThrow(
        'Rede não encontrada',
      );
    });
  });

  describe('remove', () => {
    it('remove o vínculo', async () => {
      mockDb.delete.mockReturnValue(chain([{ userId: 7, networkId: 2 }]));
      await expect(service.remove(7, 2)).resolves.toEqual({
        userId: 7,
        networkId: 2,
      });
    });

    it('vínculo inexistente dá 404', async () => {
      mockDb.delete.mockReturnValue(chain([]));
      await expect(service.remove(7, 2)).rejects.toThrow(NotFoundException);
    });
  });
});
