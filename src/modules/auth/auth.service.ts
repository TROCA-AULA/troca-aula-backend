import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly config: ConfigService,
    private jwtService: JwtService,
  ) {}

  // Esquema legado (P3, problemas-conhecidos.md do frontend): o cliente
  // computava Base64(SHA1(senha)) antes de enviar. Removido do frontend —
  // TLS + bcrypt com salt no servidor já são a defesa real, e o pré-hash
  // client-side não removia nenhum risco (era um valor determinístico
  // equivalente à senha do ponto de vista do servidor). Pior: causava um
  // bug real — contas criadas pelo painel Master (`masterService.createUser`)
  // sempre mandavam a senha temporária crua para `POST /users`, então o
  // bcrypt ali armazenava hash(senha crua); como o login sempre mandava
  // hash(SHA1(senha)), o `bcrypt.compare` nunca batia e esses usuários
  // jamais conseguiam entrar. Mantido aqui só como fallback, migrado de
  // forma lazy (re-hash na primeira vez que a conta loga com sucesso), para
  // não quebrar contas que se auto-cadastraram (`/cadastro`) antes desta
  // correção. Pode ser removido depois que a base de usuários girar.
  private legacyHash(pass: string): string {
    return createHash('sha1').update(pass).digest('base64');
  }

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneBy(username);
    if (!user) throw new UnauthorizedException();

    let isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      const legacyMatch = await bcrypt.compare(
        this.legacyHash(pass),
        user.password,
      );
      if (legacyMatch) {
        isMatch = true;
        const saltRounds = this.config.get<number>('saltRounds') as number;
        const newHash = await bcrypt.hash(pass, saltRounds);
        await this.usersService.update(user.id, { password: newHash });
      }
    }

    if (!isMatch) throw new UnauthorizedException();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userData } = user;

    // O JWT já carregava os vínculos escola/perfil do usuário; agora cada
    // vínculo leva também o `networkId` da escola (rede de ensino) para o
    // frontend poder consumir o recorte de rede (SchoolContext
    // .activeNetworkId) sem uma segunda chamada. A relação `school` crua é
    // removida do payload para não inflar o token.
    const upsUser = (userData.upsUser ?? []).map(({ school, ...link }) => ({
      ...link,
      networkId: school?.networkId ?? null,
    }));
    const payload = { sub: { ...userData, upsUser } };
    return {
      access_token: await this.jwtService.signAsync(payload, {
        secret: this.config.get('secret'),
      }),
    };
  }

  // Troca de senha pelo próprio usuário autenticado. Aceita também o
  // esquema legado como "senha atual" (mesma migração lazy do signIn), para
  // não travar contas antigas que por algum motivo ainda não relogaram.
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    let isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      isMatch = await bcrypt.compare(
        this.legacyHash(currentPassword),
        user.password,
      );
    }
    if (!isMatch) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const saltRounds = this.config.get<number>('saltRounds') as number;
    await this.usersService.update(userId, {
      password: await bcrypt.hash(newPassword, saltRounds),
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
