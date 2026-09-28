import { Test, TestingModule } from '@nestjs/testing';
import { WorkloadPoliciesRepository } from './workload-policies.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('WorkloadPoliciesRepository', () => {
  let repository: WorkloadPoliciesRepository;
  let mockDb: { insert: jest.Mock; select: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    mockDb = { insert: jest.fn(), select: jest.fn(), update: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkloadPoliciesRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();
    repository = module.get<WorkloadPoliciesRepository>(
      WorkloadPoliciesRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should stringify maxHoursPerWeek for the numeric column', async () => {
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([{ id: 1, maxHoursPerWeek: '10' }]),
      );
      const result = await repository.create({
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: 10,
      });
      expect(result).toEqual({ id: 1, maxHoursPerWeek: '10' });
    });

    it('should store null when maxHoursPerWeek is omitted and keep ataOficialRequired', async () => {
      const chain = createDrizzleChainMock([{ id: 2, maxHoursPerWeek: null }]);
      mockDb.insert.mockReturnValue(chain);

      const result = await repository.create({
        networkId: 1,
        workloadTypeId: 4,
        ataOficialRequired: false,
      });

      expect(result).toEqual({ id: 2, maxHoursPerWeek: null });
      expect(chain.values).toHaveBeenCalledWith({
        networkId: 1,
        workloadTypeId: 4,
        maxHoursPerWeek: null,
        ataOficialRequired: false,
      });
    });
  });

  describe('findByNetworkAndType', () => {
    it('should return the policy when found', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, networkId: 1, workloadTypeId: 4 }]),
      );
      const result = await repository.findByNetworkAndType(1, 4);
      expect(result).toEqual({ id: 1, networkId: 1, workloadTypeId: 4 });
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findByNetworkAndType(1, 99);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should filter by networkId when provided', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await repository.findAll(1);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should return all when no networkId provided', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1 }, { id: 2 }]),
      );
      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return the policy when found', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, networkId: 1, workloadTypeId: 4 }]),
      );
      const result = await repository.findOne(1);
      expect(result).toEqual({ id: 1, networkId: 1, workloadTypeId: 4 });
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should map both fields when provided', async () => {
      const chain = createDrizzleChainMock([
        { id: 1, maxHoursPerWeek: '12.50', ataOficialRequired: false },
      ]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.update(1, {
        maxHoursPerWeek: 12.5,
        ataOficialRequired: false,
      });

      expect(result).toEqual({
        id: 1,
        maxHoursPerWeek: '12.50',
        ataOficialRequired: false,
      });
      expect(chain.set).toHaveBeenCalledWith({
        maxHoursPerWeek: '12.5',
        ataOficialRequired: false,
      });
    });

    it('should update only maxHoursPerWeek when ataOficialRequired is omitted', async () => {
      const chain = createDrizzleChainMock([{ id: 1 }]);
      mockDb.update.mockReturnValue(chain);

      await repository.update(1, { maxHoursPerWeek: 20 });

      expect(chain.set).toHaveBeenCalledWith({ maxHoursPerWeek: '20' });
    });

    it('should update only ataOficialRequired when maxHoursPerWeek is omitted', async () => {
      const chain = createDrizzleChainMock([{ id: 1 }]);
      mockDb.update.mockReturnValue(chain);

      await repository.update(1, { ataOficialRequired: true });

      expect(chain.set).toHaveBeenCalledWith({ ataOficialRequired: true });
    });

    it('should set an empty object when no field is provided', async () => {
      const chain = createDrizzleChainMock([{ id: 1 }]);
      mockDb.update.mockReturnValue(chain);

      await repository.update(1, {});

      expect(chain.set).toHaveBeenCalledWith({});
    });
  });
});
