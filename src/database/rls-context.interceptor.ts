import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, lastValueFrom, Observable } from 'rxjs';
import { DrizzleService } from './drizzle.service';
import { TenantContextService } from '../modules/auth/tenant/tenant-context.service';

interface AuthenticatedRequest {
  user?: { id: number };
}

// Ativa o RLS por request (ADR-006 revisado): reserva uma conexão
// dedicada, resolve o tenant do usuário autenticado (bootstrap descrito no
// DrizzleService) e seta as GUCs de sessão (`app.current_network_ids`,
// `app.is_master`) que as políticas leem. Todo o handler (e as queries que
// ele faz) roda dentro desse escopo — requisições sem usuário (login,
// cadastro público, health) rodam no pool global, e as tabelas com RLS
// falham fechadas se alguém as consultar sem escopo.
@Injectable()
export class RlsContextInterceptor implements NestInterceptor {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;
    if (!userId) {
      return next.handle();
    }

    // `lastValueFrom(next.handle())` dentro do escopo garante que o handler
    // execute na na mesma conexão reservada (o Observable é frio e só roda
    // ao ser assinado).
    return from(
      this.drizzle.runWithRlsScope(
        async () => {
          const tenant = await this.tenantContextService.resolve(userId);
          return {
            isMaster: tenant.isMaster,
            networkIds: [
              ...new Set(
                tenant.links
                  .map((link) => link.networkId)
                  .filter(
                    (networkId): networkId is number => networkId !== null,
                  ),
              ),
            ],
          };
        },
        () => lastValueFrom(next.handle()),
      ),
    );
  }
}
