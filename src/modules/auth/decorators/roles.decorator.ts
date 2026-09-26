import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Uso: @Roles(ProfileName.MASTER, ProfileName.DIRETOR) acima de uma rota,
// combinado com @UseGuards(RolesGuard) (e, quando a rota tem um schoolId
// resolvível, TenantGuard antes dele — ver src/modules/auth/guards).
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
