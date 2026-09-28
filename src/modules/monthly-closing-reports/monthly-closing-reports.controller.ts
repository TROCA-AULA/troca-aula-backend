import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MonthlyClosingReportsService } from './monthly-closing-reports.service';
import { GenerateMonthlyClosingReportDto } from './dto/generate-monthly-closing-report.dto';
import { ReopenMonthlyClosingReportDto } from './dto/reopen-monthly-closing-report.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

interface AuthenticatedRequest {
  user: { id: number };
}

@Controller('monthly-closing-reports')
@UseGuards(AuthGuard)
export class MonthlyClosingReportsController {
  constructor(private readonly service: MonthlyClosingReportsService) {}

  // schoolId vem do corpo — mesmo padrão de TeacherWorkloadRecordsController.create.
  @Post('generate')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  generate(
    @Body() dto: GenerateMonthlyClosingReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.generate(dto, req.user.id);
  }

  // Listagem "de gestão" — exige perfil de gestão. Um professor vendo os
  // próprios relatórios usa GET /:id (findOneAsOwnerOrManager libera dono).
  @Get()
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  findAll(
    @Query('userId') userId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('referenceMonth') referenceMonth?: string,
  ) {
    return this.service.findAll({
      userId: userId ? +userId : undefined,
      schoolId: schoolId ? +schoolId : undefined,
      referenceMonth,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOneAsOwnerOrManager(+id, req.user.id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  review(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.review(+id, req.user.id);
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  close(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.close(+id, req.user.id);
  }

  // Correção explícita de relatório já conferido/fechado (§6.3) — exige
  // justificativa, que fica no AuditLog.
  @Patch(':id/reopen')
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_PROFILES)
  reopen(
    @Param('id') id: string,
    @Body() dto: ReopenMonthlyClosingReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.reopen(+id, dto.justification, req.user.id);
  }
}
