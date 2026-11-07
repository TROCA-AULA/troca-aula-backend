import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  const mockTenantContextService = {
    resolve: jest.fn(),
    hasSchoolAccess: jest.fn(),
  };

  const buildContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  afterEach(() => jest.clearAllMocks());

  it('should throw ForbiddenException when request has no authenticated user', async () => {
    const context = buildContext({ body: {}, query: {} });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should attach tenant and allow when no schoolId is present in body/query', async () => {
    const request: any = { user: { id: 1 }, body: {}, query: {} };
    const tenant = { userId: 1, isMaster: false, links: [] };
    mockTenantContextService.resolve.mockResolvedValue(tenant);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(request.tenant).toEqual(tenant);
    expect(request.tenantSchoolId).toBeUndefined();
    expect(mockTenantContextService.hasSchoolAccess).not.toHaveBeenCalled();
  });

  it('should allow and set tenantSchoolId when user has approved access to the schoolId in body', async () => {
    const request: any = { user: { id: 1 }, body: { schoolId: 10 }, query: {} };
    const tenant = { userId: 1, isMaster: false, links: [] };
    mockTenantContextService.resolve.mockResolvedValue(tenant);
    mockTenantContextService.hasSchoolAccess.mockReturnValue(true);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(request.tenantSchoolId).toBe(10);
    expect(mockTenantContextService.hasSchoolAccess).toHaveBeenCalledWith(
      tenant,
      10,
    );
  });

  it('should read schoolId from query when not present in body', async () => {
    const request: any = {
      user: { id: 1 },
      body: {},
      query: { schoolId: '7' },
    };
    mockTenantContextService.resolve.mockResolvedValue({
      userId: 1,
      isMaster: false,
      links: [],
    });
    mockTenantContextService.hasSchoolAccess.mockReturnValue(true);

    await guard.canActivate(buildContext(request));

    expect(request.tenantSchoolId).toBe(7);
  });

  it('should throw ForbiddenException when user has no approved link to the schoolId', async () => {
    const request: any = { user: { id: 1 }, body: { schoolId: 10 }, query: {} };
    mockTenantContextService.resolve.mockResolvedValue({
      userId: 1,
      isMaster: false,
      links: [],
    });
    mockTenantContextService.hasSchoolAccess.mockReturnValue(false);

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow MASTER even without a direct link (hasSchoolAccess bypass)', async () => {
    const request: any = {
      user: { id: 1 },
      body: { schoolId: 999 },
      query: {},
    };
    mockTenantContextService.resolve.mockResolvedValue({
      userId: 1,
      isMaster: true,
      links: [],
    });
    mockTenantContextService.hasSchoolAccess.mockReturnValue(true);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
  });
});
