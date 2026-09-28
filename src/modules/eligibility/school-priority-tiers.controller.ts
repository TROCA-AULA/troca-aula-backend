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
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { SchoolPriorityTiersService } from './school-priority-tiers.service';
import { SetPriorityTiersDto } from './dto/set-priority-tiers.dto';

interface AuthenticatedRequest {
  user: { id: number };
}

// Níveis de prioridade configuráveis por escola (Fase 5, Seção 9.3).
// Leitura e escrita restritas a quem gerencia a escola (ou MASTER) — a
// checagem fina por escola fica no service (rota sem schoolId no corpo).
@Controller('schools')
export class SchoolPriorityTiersController {
  constructor(private readonly service: SchoolPriorityTiersService) {}

  @Get(':id/priority-tiers')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.get(id, req.user.id);
  }

  @Put(':id/priority-tiers')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPriorityTiersDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.replace(id, dto, req.user.id);
  }
}
