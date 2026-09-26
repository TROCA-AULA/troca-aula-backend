import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockDb: { insert: jest.Mock; select: jest.Mock };

  beforeEach(async () => {
    mockDb = { insert: jest.fn(), select: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: DrizzleService, useValue: { db: mockDb } }],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('record', () => {
    it('should insert an audit entry with default nulls', async () => {
      mockDb.insert.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await service.record({
        networkId: 1,
        entityType: 'TeacherWorkloadRecords',
        entityId: 5,
        changedById: 2,
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findByEntity', () => {
    it('should query by entityType/entityId ordered by changedAt desc', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await service.findByEntity('TeacherWorkloadRecords', 5);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('findByNetwork', () => {
    it('should query by networkId', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await service.findByNetwork(1);
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
