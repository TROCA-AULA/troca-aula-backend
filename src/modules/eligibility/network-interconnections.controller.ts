import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';
import { NetworkInterconnectionsService } from './school-teacher-groups.service';
import { SetNetworkInterconnectionsDto } from './dto/preferences.dto';

interface AuthenticatedRequest {
  user: { id: number };
}

// Interconexão direcional entre redes (Fase 5, Seção 9.3) — gerida pelo
// MASTER (qualquer rede) e pelo COORDENADOR_MUNICIPAL (só as redes que
// coordena; a checagem fina por rede fica no service).
@Controller('networks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ProfileName.MASTER, ProfileName.COORDENADOR_MUNICIPAL)
export class NetworkInterconnectionsController {
  constructor(private readonly service: NetworkInterconnectionsService) {}

  @Get(':id/interconnections')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.get(id, req.user.id);
  }

  @Put(':id/interconnections')
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetNetworkInterconnectionsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.replace(id, dto, req.user.id);
  }
}
