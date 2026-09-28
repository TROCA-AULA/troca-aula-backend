import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository, FindAllUsersFilter } from './users.repository';
import { TenantContextService } from '../auth/tenant/tenant-context.service';
import { MANAGER_PROFILES } from '../auth/tenant/tenant-context';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService,
    private readonly tenantContextService: TenantContextService,
  ) {}
  create(createUserDto: CreateUserDto) {
    return this.usersRepository.create(createUserDto);
  }

  assignProfile(
    userId: number,
    profileId: number,
    schoolId: number,
    approvedById: number,
  ) {
    return this.usersRepository.assignProfile(
      userId,
      profileId,
      schoolId,
      approvedById,
    );
  }

  unassignProfile(userId: number, profileId: number, schoolId: number) {
    return this.usersRepository.unassignProfile(userId, profileId, schoolId);
  }

  findAll(filter?: FindAllUsersFilter) {
    return this.usersRepository.findAll(filter);
  }

  findOne(id: number) {
    return this.usersRepository.findOne(id);
  }
  findOneBy(email: string) {
    return this.usersRepository.findOneBy(email);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  // Redefinição de senha por gestor (contraparte do fluxo de senha
  // temporária do painel Master, que só existia na criação da conta). A
  // senha é gerada no servidor e devolvida UMA vez para quem redefiniu
  // repassar — não há envio por e-mail (visão de futuro).
  async resetPassword(targetId: number, requesterId: number) {
    const target = await this.usersRepository.findOne(targetId);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // MASTER redefine qualquer conta; DIRETOR/AUXILIAR_ADMIN só de quem
    // compartilha uma escola que ele gerencia (mesmo espírito do
    // TenantGuard, mas sem schoolId no corpo da rota).
    const tenant = await this.tenantContextService.resolve(requesterId);
    const managerSchoolIds = tenant.links
      .filter((link) => (MANAGER_PROFILES as string[]).includes(link.profileName))
      .map((link) => link.schoolId);
    const targetSchoolIds = (target.upsUser ?? [])
      .filter((link) => link.approvedAt)
      .map((link) => link.schoolId);

    const sharesManagedSchool = managerSchoolIds.some((schoolId) =>
      targetSchoolIds.includes(schoolId),
    );
    if (!tenant.isMaster && !sharesManagedSchool) {
      throw new ForbiddenException(
        'Sem permissão para redefinir a senha deste usuário',
      );
    }

    const tempPassword = randomBytes(6).toString('base64url');
    const saltRounds = this.config.get<number>('saltRounds') as number;
    await this.usersRepository.update(targetId, {
      password: await bcrypt.hash(tempPassword, saltRounds),
    });

    return { tempPassword };
  }

  remove(id: number) {
    return this.usersRepository.remove(id);
  }
}
