import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NetworksService } from './networks.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';

// Rede é o tenant real da plataforma (Design Doc, ADR-004) — só MASTER
// cria/edita redes. Sem DELETE: apagar uma rede inteira (e suas escolas,
// restringidas por FK) não tem regra de negócio definida ainda.
@Controller('networks')
@UseGuards(AuthGuard)
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  create(@Body() createNetworkDto: CreateNetworkDto) {
    return this.networksService.create(createNetworkDto);
  }

  @Get()
  findAll() {
    return this.networksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.networksService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  update(@Param('id') id: string, @Body() updateNetworkDto: UpdateNetworkDto) {
    return this.networksService.update(+id, updateNetworkDto);
  }
}
