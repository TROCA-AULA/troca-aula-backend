import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockTenantContextService = {
    resolve: jest.fn(),
    hasSchoolAccess: jest.fn(),
    hasAnyRole: jest.fn(),
  };

  const buildContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('should allow when no @Roles metadata is set on the route', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const request: any = { user: { id: 1 } };

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(mockTenantContextService.resolve).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when request has no authenticated user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MASTER']);
    const request: any = {};

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should use hasSchoolAccess when TenantGuard already resolved a tenantSchoolId', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['DIRETOR']);
    const tenant = { userId: 1, isMaster: false, links: [] };
    const request: any = { user: { id: 1 }, tenant, tenantSchoolId: 10 };
    mockTenantContextService.hasSchoolAccess.mockReturnValue(true);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(mockTenantContextService.hasSchoolAccess).toHaveBeenCalledWith(
      tenant,
      10,
      ['DIRETOR'],
    );
    expect(mockTenantContextService.hasAnyRole).not.toHaveBeenCalled();
    // não deveria re-resolver o tenant, já veio pronto do TenantGuard
    expect(mockTenantContextService.resolve).not.toHaveBeenCalled();
  });

  it('should fall back to hasAnyRole when no tenantSchoolId was resolved', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MASTER']);
    const tenant = { userId: 1, isMaster: false, links: [] };
    const request: any = { user: { id: 1 }, tenant };
    mockTenantContextService.hasAnyRole.mockReturnValue(true);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(mockTenantContextService.hasAnyRole).toHaveBeenCalledWith(tenant, [
      'MASTER',
    ]);
  });

  it('should resolve tenant itself when used without a preceding TenantGuard', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MASTER']);
    const request: any = { user: { id: 1 } };
    const tenant = { userId: 1, isMaster: true, links: [] };
    mockTenantContextService.resolve.mockResolvedValue(tenant);
    mockTenantContextService.hasAnyRole.mockReturnValue(true);

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(mockTenantContextService.resolve).toHaveBeenCalledWith(1);
    expect(request.tenant).toEqual(tenant);
  });

  it('should throw ForbiddenException when role check fails', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MASTER']);
    const request: any = {
      user: { id: 1 },
      tenant: { userId: 1, isMaster: false, links: [] },
    };
    mockTenantContextService.hasAnyRole.mockReturnValue(false);

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
