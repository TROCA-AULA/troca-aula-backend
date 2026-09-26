import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TenantContext } from '../tenant/tenant-context';
import { TenantContextService } from '../tenant/tenant-context.service';

interface RequestWithTenant extends Request {
  user?: { id: number };
  tenant?: TenantContext;
  tenantSchoolId?: number;
}

// Roda depois do AuthGuard (e, quando presente, do TenantGuard). Lê os
// perfis exigidos via @Roles(...) e decide:
// - se o TenantGuard já resolveu um schoolId para esta requisição, exige
//   que o usuário tenha um vínculo aprovado NAQUELA escola com um dos
//   perfis exigidos (hasSchoolAccess) — evita o bug de "tem o perfil em
//   qualquer escola" liberar ação sobre uma escola diferente;
// - senão (rota sem schoolId resolvível, ex.: catálogo global de
//   disciplinas, ou entidade por :id sem schoolId no corpo), cai para uma
//   checagem só de perfil (hasAnyRole) — o refinamento por entidade, quando
//   necessário, fica a cargo do service (ver ClassesService.update/remove).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const tenant: TenantContext =
      request.tenant ?? (await this.tenantContextService.resolve(userId));
    request.tenant = tenant;

    const allowed =
      request.tenantSchoolId !== undefined
        ? this.tenantContextService.hasSchoolAccess(
            tenant,
            request.tenantSchoolId,
            requiredRoles,
          )
        : this.tenantContextService.hasAnyRole(tenant, requiredRoles);

    if (!allowed) {
      throw new ForbiddenException(
        'Perfil sem permissão para executar esta ação',
      );
    }

    return true;
  }
}
