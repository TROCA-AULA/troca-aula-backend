import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DrizzleService } from './drizzle.service';
import { RlsContextInterceptor } from './rls-context.interceptor';

// Substitui PrismaModule (removido nesta migração) — mesmo motivo de ser
// @Global(): DrizzleService é injetado por praticamente todo repository.
// O RlsContextInterceptor é registrado globalmente aqui (ADR-006): todo
// request autenticado roda com conexão reservada + GUCs de sessão para o
// RLS; requests sem usuário seguem no pool global (políticas falham
// fechadas se consultarem tabela com RLS sem escopo).
@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsContextInterceptor,
    },
  ],
  exports: [DrizzleService],
})
export class DatabaseModule {}
