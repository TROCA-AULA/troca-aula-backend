import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';
import { SchoolTeacherGroupsService } from './school-teacher-groups.service';
import {
  CreateTeacherGroupDto,
  SetGroupMembersDto,
  UpdatePrioritySettingsDto,
  UpdateTeacherGroupDto,
} from './dto/teacher-groups.dto';

interface AuthenticatedRequest {
  user: { id: number };
}

// Fase 5 (modelo de grupos): CRUD dos grupos da escola + classificação de
// professores + configurações de prioridade. A checagem fina por escola
// fica no service (rota sem schoolId no corpo).
@Controller('schools')
export class SchoolTeacherGroupsController {
  constructor(private readonly service: SchoolTeacherGroupsService) {}

  @Get(':id/teacher-groups')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.get(id, req.user.id);
  }

  @Post(':id/teacher-groups')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTeacherGroupDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createGroup(id, dto, req.user.id);
  }

  @Patch(':id/teacher-groups/:groupId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: UpdateTeacherGroupDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateGroup(id, groupId, dto, req.user.id);
  }

  @Delete(':id/teacher-groups/:groupId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.removeGroup(id, groupId, req.user.id);
  }

  @Put(':id/teacher-groups/:groupId/members')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  setMembers(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: SetGroupMembersDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.setMembers(id, groupId, dto.professorIds, req.user.id);
  }

  @Patch(':id/priority-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MANAGER_PROFILES)
  updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrioritySettingsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateSettings(id, dto, req.user.id);
  }
}
