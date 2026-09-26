import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantContextService } from '../tenant/tenant-context.service';

interface RequestWithTenant extends Request {
  user?: { id: number };
  tenant?: unknown;
  tenantSchoolId?: number;
}

// Roda depois do AuthGuard. Resolve o contexto de tenant do usuário
// autenticado (request.tenant) e, se a requisição informar um schoolId
// (body ou query), valida que o usuário tem vínculo aprovado com aquela
// escola (ou é MASTER) — senão 403. Não decide PERFIL aqui, só posse de
// escola; a checagem de perfil fica a cargo do RolesGuard, que roda em
// seguida e reaproveita o schoolId já resolvido (request.tenantSchoolId).
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const tenant = await this.tenantContextService.resolve(userId);
    request.tenant = tenant;

    const schoolId = this.resolveSchoolId(request);
    if (schoolId !== undefined) {
      if (!this.tenantContextService.hasSchoolAccess(tenant, schoolId)) {
        throw new ForbiddenException(
          'Você não tem vínculo aprovado com esta escola',
        );
      }
      request.tenantSchoolId = schoolId;
    }

    return true;
  }

  private resolveSchoolId(request: RequestWithTenant): number | undefined {
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown> | undefined;
    const raw = body?.schoolId ?? query?.schoolId;

    if (raw === undefined || raw === null || raw === '') {
      return undefined;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
