import { Test, TestingModule } from '@nestjs/testing';
import { NetworksRepository } from './networks.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('NetworksRepository', () => {
  let repository: NetworksRepository;
  let mockDb: { insert: jest.Mock; select: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    mockDb = { insert: jest.fn(), select: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworksRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<NetworksRepository>(NetworksRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a network', async () => {
      const dto = { name: 'Rede Municipal X' };
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.create(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all networks', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, name: 'Rede Municipal X' }]),
      );
      const result = await repository.findAll();
      expect(result).toEqual([{ id: 1, name: 'Rede Municipal X' }]);
    });
  });

  describe('findOne', () => {
    it('should return a network by id', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, name: 'Rede Municipal X' }]),
      );
      const result = await repository.findOne(1);
      expect(result).toEqual({ id: 1, name: 'Rede Municipal X' });
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a network', async () => {
      const dto = { name: 'Rede Renomeada' };
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.update(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });
});
