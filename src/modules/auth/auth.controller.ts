import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: LoginDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
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
