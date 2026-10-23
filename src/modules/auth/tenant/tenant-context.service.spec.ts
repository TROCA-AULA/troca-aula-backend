import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { DrizzleService } from '../../../database/drizzle.service';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let mockDb: {
    query: {
      users: { findFirst: jest.Mock };
      schools: { findMany: jest.Mock };
    };
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        users: { findFirst: jest.fn() },
        schools: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
            runPrivileged: (fn: () => unknown) => fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('coordenador municipal', () => {
    it('ganha um vínculo de gestão em cada escola das redes que coordena', async () => {
      const approvedAt = new Date('2026-10-01');
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 9,
        upsUser: [],
        networkLinks: [{ networkId: 2, approvedAt }],
      });
      mockDb.query.schools.findMany.mockResolvedValue([
        { id: 4, networkId: 2 },
        { id: 5, networkId: 2 },
      ]);

      const tenant = await service.resolve(9);

      expect(tenant.coordinatedNetworkIds).toEqual([2]);
      expect(tenant.isMaster).toBe(false);
      expect(tenant.links).toEqual([
        {
          schoolId: 4,
          profileId: 5,
          profileName: 'COORDENADOR_MUNICIPAL',
          approvedAt,
          networkId: 2,
        },
        {
          schoolId: 5,
          profileId: 5,
          profileName: 'COORDENADOR_MUNICIPAL',
          approvedAt,
          networkId: 2,
        },
      ]);
      expect(
        service.hasSchoolAccess(tenant, 5, [
          'DIRETOR',
          'COORDENADOR_MUNICIPAL',
        ]),
      ).toBe(true);
      expect(service.hasSchoolAccess(tenant, 6)).toBe(false);
    });

    it('sem rede coordenada não consulta escolas', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ id: 1, upsUser: [] });

      const tenant = await service.resolve(1);

      expect(tenant.coordinatedNetworkIds).toEqual([]);
      expect(mockDb.query.schools.findMany).not.toHaveBeenCalled();
    });
  });

  describe('canManageNetwork / assertCanManageNetwork', () => {
    const base = { userId: 1, links: [], subjectId: null };

    it('MASTER gerencia qualquer rede', () => {
      expect(service.canManageNetwork({ ...base, isMaster: true }, 99)).toBe(
        true,
      );
    });

    it('coordenador só gerencia as redes dele', () => {
      const tenant = { ...base, isMaster: false, coordinatedNetworkIds: [2] };
      expect(service.canManageNetwork(tenant, 2)).toBe(true);
      expect(service.canManageNetwork(tenant, 3)).toBe(false);
      expect(service.canManageNetwork({ ...base, isMaster: false }, 2)).toBe(
        false,
      );
    });

    it('assertCanManageNetwork lança 403 fora da rede e devolve o tenant dentro', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 9,
        upsUser: [],
        networkLinks: [{ networkId: 2, approvedAt: new Date() }],
      });

      await expect(service.assertCanManageNetwork(9, 3)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.assertCanManageNetwork(9, 2)).resolves.toEqual(
        expect.objectContaining({ coordinatedNetworkIds: [2] }),
      );
    });
  });

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
              with: expect.objectContaining({ profile: true }),
            }),
          }),
        }),
      );
    });

    it('should resolve each link networkId from the school relation', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        upsUser: [
          {
            schoolId: 7,
            profileId: 3,
            approvedAt: new Date(),
            profile: { name: 'PROFESSOR' },
            school: { networkId: 9 },
          },
        ],
      });

      const tenant = await service.resolve(1);

      expect(tenant.links[0]).toEqual(
        expect.objectContaining({ schoolId: 7, networkId: 9 }),
      );
    });
  });

  describe('hasSchoolAccess', () => {
    it('returns true for MASTER regardless of school', () => {
      const tenant = { userId: 1, isMaster: true, subjectId: null, links: [] };
      expect(service.hasSchoolAccess(tenant, 999)).toBe(true);
    });

    it('returns true when a link matches the school and no profile filter is given', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 10,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      };
      expect(service.hasSchoolAccess(tenant, 10)).toBe(true);
    });

    it('returns false when no link matches the school', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 10,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      };
      expect(service.hasSchoolAccess(tenant, 99)).toBe(false);
    });

    it('returns false when the link matches the school but not the allowed profiles', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 10,
            profileId: 3,
            profileName: 'PROFESSOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      };
      expect(service.hasSchoolAccess(tenant, 10, ['DIRETOR'])).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true for MASTER regardless of roles', () => {
      const tenant = { userId: 1, isMaster: true, subjectId: null, links: [] };
      expect(service.hasAnyRole(tenant, ['DIRETOR'])).toBe(true);
    });

    it('returns true when any link has an allowed profile', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 1,
            profileId: 1,
            profileName: 'DIRETOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      };
      expect(service.hasAnyRole(tenant, ['DIRETOR', 'MASTER'])).toBe(true);
    });

    it('returns false when no link has an allowed profile', () => {
      const tenant = {
        userId: 1,
        isMaster: false,
        subjectId: null,
        links: [
          {
            schoolId: 1,
            profileId: 3,
            profileName: 'PROFESSOR',
            approvedAt: new Date(),
            networkId: null,
          },
        ],
      };
      expect(service.hasAnyRole(tenant, ['DIRETOR', 'MASTER'])).toBe(false);
    });
  });
});
