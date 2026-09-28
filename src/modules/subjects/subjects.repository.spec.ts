import { Test, TestingModule } from '@nestjs/testing';
import { SubjectRepository } from './subjects.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('SubjectRepository', () => {
  let repository: SubjectRepository;
  let mockDb: {
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<SubjectRepository>(SubjectRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a subject', async () => {
      const dto = { name: 'Math' };
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.create(dto);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all subjects (not deleted)', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, name: 'Math' }]),
      );
      const result = await repository.findAll();
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Math' }]);
    });
  });

  describe('findOne', () => {
    it('should find one subject', async () => {
      mockDb.select.mockReturnValue(
        createDrizzleChainMock([{ id: 1, name: 'Math' }]),
      );
      const result = await repository.findOne(1);
      expect(result).toEqual({ id: 1, name: 'Math' });
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a subject', async () => {
      const dto = { name: 'Math Updated' };
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.update(1, dto);
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should soft-delete a subject (set deletedAt)', async () => {
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([
          { id: 1, name: 'Math', deletedAt: new Date() },
        ]),
      );
      const result = await repository.remove(1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });
});
