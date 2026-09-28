import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { DrizzleService } from '../../database/drizzle.service';
import { createDrizzleChainMock } from '../../database/test-utils/drizzle-chain-mock';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let mockDb: {
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    query: {
      users: { findMany: jest.Mock; findFirst: jest.Mock };
      usersProfilesSchools: { findMany: jest.Mock };
    };
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: {
        users: { findMany: jest.fn(), findFirst: jest.fn() },
        usersProfilesSchools: { findMany: jest.fn() },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        password: 'hash',
      };
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([{ id: 10, ...dto }]),
      );

      const result = await repository.create(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({ id: 10, ...dto });
    });
  });

  describe('assignProfile', () => {
    it('should insert an approved users_profiles_schools link', async () => {
      mockDb.insert.mockReturnValue(
        createDrizzleChainMock([
          { userId: 1, profileId: 2, schoolId: 3, approvedById: 9 },
        ]),
      );

      const result = await repository.assignProfile(1, 2, 3, 9);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 1,
        profileId: 2,
        schoolId: 3,
        approvedById: 9,
      });
    });
  });

  describe('unassignProfile', () => {
    it('should delete the users_profiles_schools link', async () => {
      mockDb.delete.mockReturnValue(
        createDrizzleChainMock([{ userId: 1, profileId: 2, schoolId: 3 }]),
      );

      const result = await repository.unassignProfile(1, 2, 3);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual({ userId: 1, profileId: 2, schoolId: 3 });
    });

    it('should return null when no link existed', async () => {
      mockDb.delete.mockReturnValue(createDrizzleChainMock([]));
      const result = await repository.unassignProfile(1, 2, 3);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all users with profile links when no filter given', async () => {
      mockDb.query.users.findMany.mockResolvedValue([]);
      const result = await repository.findAll();
      expect(mockDb.query.users.findMany).toHaveBeenCalled();
      expect(mockDb.query.usersProfilesSchools.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should filter by schoolId/profileId via UsersProfilesSchools', async () => {
      mockDb.query.usersProfilesSchools.findMany.mockResolvedValue([
        { userId: 5 },
        { userId: 5 },
        { userId: 7 },
      ]);
      mockDb.query.users.findMany.mockResolvedValue([{ id: 5 }, { id: 7 }]);

      const result = await repository.findAll({ schoolId: 1, profileId: 3 });

      expect(mockDb.query.usersProfilesSchools.findMany).toHaveBeenCalled();
      expect(mockDb.query.users.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 5 }, { id: 7 }]);
    });

    it('should return an empty array without querying users when no link matches', async () => {
      mockDb.query.usersProfilesSchools.findMany.mockResolvedValue([]);
      const result = await repository.findAll({ schoolId: 999 });
      expect(result).toEqual([]);
      expect(mockDb.query.users.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find one user by id', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ id: 1 });
      const result = await repository.findOne(1);
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findOneBy', () => {
    it('should find one user by email', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });
      const result = await repository.findOneBy('test@test.com');
      expect(result).toEqual({ id: 1, email: 'test@test.com' });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto = { name: 'Updated' };
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, ...dto }]),
      );
      const result = await repository.update(1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('remove', () => {
    it('should soft-delete a user', async () => {
      mockDb.update.mockReturnValue(
        createDrizzleChainMock([{ id: 1, deletedAt: new Date() }]),
      );
      const result = await repository.remove(1);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });
});
