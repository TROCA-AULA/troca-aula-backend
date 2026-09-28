import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { EnrollmentRequestsService } from './enrollment-requests.service';
import { FilterEnrollmentRequestDto } from './dto/filter-enrollment-request.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('enrollment-requests')
@UseGuards(AuthGuard)
export class EnrollmentRequestsController {
  constructor(
    private readonly enrollmentRequestsService: EnrollmentRequestsService,
  ) {}

  @Post('request/:classId')
  request(@Param('classId', ParseIntPipe) classId: number, @Request() req) {
    return this.enrollmentRequestsService.create(classId, req.user.id);
  }

  @Get()
  findAll(@Query() query: FilterEnrollmentRequestDto, @Request() req) {
    return this.enrollmentRequestsService.findAll(query, req.user.id);
  }

  // Status já calculado no servidor (limite, contagem do semestre atual,
  // pode candidatar-se) — fonte única de verdade, substitui o cálculo de
  // semestre que o frontend fazia com o relógio do navegador (P14).
  @Get('substitution-limit/:professorId')
  getSubstitutionLimitStatus(
    @Param('professorId', ParseIntPipe) professorId: number,
    @Request() req,
  ) {
    return this.enrollmentRequestsService.getSubstitutionLimitStatus(
      professorId,
      req.user.id,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.enrollmentRequestsService.approve(id, req.user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.enrollmentRequestsService.reject(id, req.user.id);
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.enrollmentRequestsService.cancel(id, req.user.id);
  }
}
