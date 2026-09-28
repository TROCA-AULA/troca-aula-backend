import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from './auth.guard';

interface AuthenticatedRequest {
  user: { id: number };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: LoginDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('change-password')
  @UseGuards(AuthGuard)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('govbr-auth-url')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  govbrAuthUrl() {
    return {
      data: null,
      message: 'Integracao Gov.br em desenvolvimento',
      statusCode: HttpStatus.NOT_IMPLEMENTED,
    };
  }

  @HttpCode(HttpStatus.UNAUTHORIZED)
  @Post('login-govbr')
  loginGovBr() {
    return {
      data: null,
      message: 'Recurso em desenvolvimento',
      statusCode: HttpStatus.UNAUTHORIZED,
    };
  }
}
