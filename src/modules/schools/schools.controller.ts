import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileName } from '../auth/tenant/tenant-context';

interface AuthenticatedRequest {
  user: { id: number };
}

// Escola é a própria entidade-tenant (Design Doc ADR-004). Criar/editar:
// MASTER (qualquer rede) ou COORDENADOR_MUNICIPAL (só nas redes que
// coordena — checado no service). Apagar: só MASTER. Leitura: qualquer
// autenticado, já recortada pelo RLS às redes de quem chama.
@Controller('schools')
@UseGuards(AuthGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.COORDENADOR_MUNICIPAL)
  create(
    @Body() createSchoolDto: CreateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.schoolsService.create(createSchoolDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER, ProfileName.COORDENADOR_MUNICIPAL)
  update(
    @Param('id') id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.schoolsService.update(+id, updateSchoolDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(ProfileName.MASTER)
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(+id);
  }
}
