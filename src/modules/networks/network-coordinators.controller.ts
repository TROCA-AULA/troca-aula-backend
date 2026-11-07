import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';
import { NetworkCoordinatorsService } from './network-coordinators.service';
import { CreateNetworkCoordinatorDto } from './dto/network-coordinator.dto';

interface AuthenticatedRequest {
  user: { id: number };
}

// Coordenadores municipais: quem gerencia TODAS as escolas de uma rede.
// Só o MASTER decide quem coordena qual rede (Design Doc, Seção 9.3).
@Controller('network-coordinators')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ProfileName.MASTER)
export class NetworkCoordinatorsController {
  constructor(private readonly service: NetworkCoordinatorsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateNetworkCoordinatorDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto.userId, dto.networkId, req.user.id);
  }

  @Delete(':userId/:networkId')
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('networkId', ParseIntPipe) networkId: number,
  ) {
    return this.service.remove(userId, networkId);
  }
}
