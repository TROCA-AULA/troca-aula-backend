import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { DrizzleService } from '../../../database/drizzle.service';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let mockDb: { query: { users: { findFirst: jest.Mock } } };

  beforeEach(async () => {
    mockDb = { query: { users: { findFirst: jest.fn() } } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        { provide: DrizzleService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolve', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      await expect(service.resolve(999)).rejects.toThrow(NotFoundException);
    });

    it('should mark isMaster when any approved link has MASTER profile', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 1,
            profileId: 4,
            approvedAt: new Date(),
            profile: { name: 'MASTER' },
          },
        ],
      });

      const tenant = await service.resolve(1);

      expect(tenant.isMaster).toBe(true);
      expect(tenant.links).toHaveLength(1);
    });

    it('should query users.findFirst with the resolved id', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ id: 1, upsUser: [] });

      await service.resolve(1);

      expect(mockDb.query.users.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          with: expect.objectContaining({
            upsUser: expect.objectContaining({
              with: { profile: true },
            }),
          }),
        }),
      );
    });
  });

  describe('hasSchoolAccess', () => {
    it('returns true for MASTER regardless of school', () => {
      const tenant = { userId: 1, isMaster: true, links: [] };
      expect(service.hasSchoolAccess(tenant, 999)).toBe(true);
    });

    it('returns true when a link matches the school and no profile filter is given', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        links: [
          {
            schoolId: 10,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
          },
        ],
      };
      expect(service.hasSchoolAccess(tenant, 10)).toBe(true);
    });

    it('returns false when no link matches the school', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        links: [
          {
            schoolId: 10,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
          },
        ],
      };
      expect(service.hasSchoolAccess(tenant, 99)).toBe(false);
    });

    it('returns false when the link matches the school but not the allowed profiles', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        links: [
          {
            schoolId: 10,
            profileId: 3,
            profileName: 'PROFESSOR',
            approvedAt: new Date(),
          },
        ],
      };
      expect(service.hasSchoolAccess(tenant, 10, ['DIRETOR'])).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true for MASTER regardless of roles', () => {
      const tenant = { userId: 1, isMaster: true, links: [] };
      expect(service.hasAnyRole(tenant, ['DIRETOR'])).toBe(true);
    });

    it('returns true when any link has an allowed profile', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        links: [
          {
            schoolId: 1,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
          },
        ],
      };
      expect(service.hasAnyRole(tenant, ['DIRETOR', 'MASTER'])).toBe(true);
    });

    it('returns false when no link has an allowed profile', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        links: [
          {
            schoolId: 1,
            profileId: 3,
            profileName: 'PROFESSOR',
            approvedAt: new Date(),
          },
        ],
      };
      expect(service.hasAnyRole(tenant, ['DIRETOR', 'MASTER'])).toBe(false);
    });
  });
});
