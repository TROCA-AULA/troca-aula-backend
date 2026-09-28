import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkloadPoliciesService } from './workload-policies.service';
import { WorkloadPoliciesRepository } from './workload-policies.repository';

describe('WorkloadPoliciesService', () => {
  let service: WorkloadPoliciesService;
  let repository: jest.Mocked<WorkloadPoliciesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkloadPoliciesService,
        {
          provide: WorkloadPoliciesRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkloadPoliciesService>(WorkloadPoliciesService);
    repository = module.get(WorkloadPoliciesRepository);
  });

  describe('create', () => {
    it('delegates to repository.create', async () => {
      const dto = { networkId: 1, workloadTypeId: 4, maxHoursPerWeek: 10 };
      const created = { id: 1, ...dto };
      repository.create.mockResolvedValue(created as any);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('filters by network when a networkId is provided', async () => {
      const policies = [{ id: 1, networkId: 1 }];
      repository.findAll.mockResolvedValue(policies as any);

      const result = await service.findAll(1);

      expect(repository.findAll).toHaveBeenCalledWith(1);
      expect(result).toEqual(policies);
    });

    it('lists every policy when no networkId is provided', async () => {
      repository.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns the policy when found', async () => {
      const policy = { id: 1, networkId: 1, workloadTypeId: 4 };
      repository.findOne.mockResolvedValue(policy as any);

      await expect(service.findOne(1)).resolves.toEqual(policy);
      expect(repository.findOne).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when the policy does not exist', async () => {
      repository.findOne.mockResolvedValue(null as any);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('delegates to repository.update', async () => {
      const dto = { maxHoursPerWeek: 12 };
      const updated = { id: 1, networkId: 1, workloadTypeId: 4, ...dto };
      repository.update.mockResolvedValue(updated as any);

      const result = await service.update(1, dto);

      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });
});
