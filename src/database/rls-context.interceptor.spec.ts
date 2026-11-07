import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RlsContextInterceptor } from './rls-context.interceptor';
import { DrizzleService } from './drizzle.service';
import { TenantContextService } from '../modules/auth/tenant/tenant-context.service';

describe('RlsContextInterceptor', () => {
  let interceptor: RlsContextInterceptor;
  let capturedScope: { networkIds: number[]; isMaster: boolean } | null;
  const mockDrizzle = {
    runWithRlsScope: jest.fn(
      async (
        resolveScope: () => Promise<{
          networkIds: number[];
          isMaster: boolean;
        }>,
        fn: () => Promise<unknown>,
      ) => {
        capturedScope = await resolveScope();
        return fn();
      },
    ),
  };
  const mockTenant = { resolve: jest.fn() };

  const contextWithUser = (user?: { id: number }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const next = { handle: () => of('ok') } as CallHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedScope = null;
    interceptor = new RlsContextInterceptor(
      mockDrizzle as unknown as DrizzleService,
      mockTenant as unknown as TenantContextService,
    );
  });

  it('sem usuário, não abre escopo (pool global)', async () => {
    const result = await interceptor.intercept(contextWithUser(), next);

    expect(mockDrizzle.runWithRlsScope).not.toHaveBeenCalled();
    expect(await lastValueFrom(result)).toBe('ok');
  });

  it('com usuário, resolve o tenant e roda o handler no escopo', async () => {
    mockTenant.resolve.mockResolvedValue({
      userId: 7,
      isMaster: false,
      subjectId: 1,
      links: [
        {
          schoolId: 1,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 2,
        },
        {
          schoolId: 2,
          profileId: 3,
          profileName: 'PROFESSOR',
          approvedAt: new Date(),
          networkId: 2,
        },
        {
          schoolId: 3,
          profileId: 1,
          profileName: 'DIRETOR',
          approvedAt: new Date(),
          networkId: 4,
        },
      ],
    });

    const result = await interceptor.intercept(
      contextWithUser({ id: 7 }),
      next,
    );

    expect(await lastValueFrom(result)).toBe('ok');
    expect(capturedScope).toEqual({ networkIds: [2, 4], isMaster: false });
  });

  it('MASTER roda com isMaster=true', async () => {
    mockTenant.resolve.mockResolvedValue({
      userId: 1,
      isMaster: true,
      subjectId: null,
      links: [],
    });

    const result = await interceptor.intercept(
      contextWithUser({ id: 1 }),
      next,
    );

    await lastValueFrom(result);
    expect(capturedScope).toEqual({ networkIds: [], isMaster: true });
  });
});
