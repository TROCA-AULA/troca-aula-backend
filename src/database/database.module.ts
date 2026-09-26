import { Global, Module } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

// Substitui PrismaModule (removido nesta migração) — mesmo motivo de ser
// @Global(): DrizzleService é injetado por praticamente todo repository.
@Global()
@Module({
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DatabaseModule {}
