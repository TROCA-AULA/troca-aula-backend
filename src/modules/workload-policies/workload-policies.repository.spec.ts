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
});
