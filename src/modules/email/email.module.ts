import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

// Global como TenantModule/DatabaseModule: usado por módulos diferentes
// (candidaturas e aulas) sem import explícito em cada um.
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
