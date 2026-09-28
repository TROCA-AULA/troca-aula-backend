import { Test, TestingModule } from '@nestjs/testing';
import { ProfileRepository } from './profile.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('ProfileRepository', () => {
  let repository: ProfileRepository;
  let mockDb: {
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<ProfileRepository>(ProfileRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a profile', async () => {
      const dto = { name: 'Admin' };
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.create(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('should find all profiles', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find one profile', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await repository.findOne(1);
      expect(result).toEqual({ id: 1 });
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const dto = { name: 'Super Admin' };
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.update(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should hard-delete a profile (no soft delete for Profiles)', async () => {
      mockDb.delete.mockReturnValue(createDrizzleChainMock([{ id: 1 }]));
      const result = await repository.remove(1);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });
});
