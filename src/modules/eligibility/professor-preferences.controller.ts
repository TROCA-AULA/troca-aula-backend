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
import { ProfessorPreferencesService } from './professor-preferences.service';
import { NetworkReferenceDto, SchoolReferenceDto } from './dto/preferences.dto';

interface AuthenticatedRequest {
  user: { id: number };
}

// Preferências do próprio professor (interesses/exclusões) — Fase 5.
@Controller('professor-preferences')
@UseGuards(AuthGuard)
export class ProfessorPreferencesController {
  constructor(private readonly service: ProfessorPreferencesService) {}

  @Get()
  getMine(@Request() req: AuthenticatedRequest) {
    return this.service.getMine(req.user.id);
  }

  @Post('network-interests')
  addNetworkInterest(
    @Body() dto: NetworkReferenceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.addNetworkInterest(req.user.id, dto.networkId);
  }

  @Delete('network-interests/:networkId')
  removeNetworkInterest(
    @Param('networkId', ParseIntPipe) networkId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.removeNetworkInterest(req.user.id, networkId);
  }

  @Post('school-exclusions')
  addSchoolExclusion(
    @Body() dto: SchoolReferenceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.addSchoolExclusion(req.user.id, dto.schoolId);
  }

  @Delete('school-exclusions/:schoolId')
  removeSchoolExclusion(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.removeSchoolExclusion(req.user.id, schoolId);
  }
}
