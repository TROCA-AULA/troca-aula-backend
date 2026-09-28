import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsRepository } from './schools.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('SchoolsRepository', () => {
  let repository: SchoolsRepository;
  let mockDb: { insert: jest.Mock; select: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    mockDb = { insert: jest.fn(), select: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<SchoolsRepository>(SchoolsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a school', async () => {
      const dto = { name: 'School A', networkId: 1 };
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.create(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all schools', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, name: 'School A' }]),
      );
      const result = await repository.findAll();
      expect(result).toEqual([{ id: 1, name: 'School A' }]);
    });
  });

  describe('updatePriorityWindow', () => {
    it('should set priorityWindowHours and return the updated school', async () => {
      const chain = createDrizzleChainMock([
        { id: 1, name: 'School A', priorityWindowHours: 24 },
      ]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.updatePriorityWindow(1, 24);

      expect(result).toEqual({
        id: 1,
        name: 'School A',
        priorityWindowHours: 24,
      });
      expect(chain.set).toHaveBeenCalledWith({ priorityWindowHours: 24 });
    });

    it('should clear priorityWindowHours when null is provided', async () => {
      const chain = createDrizzleChainMock([
        { id: 1, name: 'School A', priorityWindowHours: null },
      ]);
      mockDb.update.mockReturnValue(chain);

      const result = await repository.updatePriorityWindow(1, null);

      expect(result.priorityWindowHours).toBeNull();
      expect(chain.set).toHaveBeenCalledWith({ priorityWindowHours: null });
    });
  });

  describe('findOne', () => {
    it('should find one school', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, name: 'School A' }]),
      );
      const result = await repository.findOne(1);
      expect(result).toEqual({ id: 1, name: 'School A' });
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a school', async () => {
      const dto = { name: 'School Updated' };
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.update(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should soft-delete a school', async () => {
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([
          { id: 1, name: 'School A', deletedAt: new Date() },
        ]),
      );
      const result = await repository.remove(1);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });
});
