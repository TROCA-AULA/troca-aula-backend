import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';
import { NetworkInterconnectionsService } from './school-priority-tiers.service';
import { SetNetworkInterconnectionsDto } from './dto/preferences.dto';

// Interconexão direcional entre redes (Fase 5, Seção 9.3) — gerida só
// pelo MASTER neste ciclo (premissa Q5 da Seção 9.5).
@Controller('networks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ProfileName.MASTER)
export class NetworkInterconnectionsController {
  constructor(private readonly service: NetworkInterconnectionsService) {}

  @Get(':id/interconnections')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Put(':id/interconnections')
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetNetworkInterconnectionsDto,
  ) {
    return this.service.replace(id, dto);
  }
}
