import { Module } from '@nestjs/common';
import { SwapRequestsService } from './swap-requests.service';
import { SwapRequestsController } from './swap-requests.controller';
import { SwapRequestsRepository } from './swap-requests.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [SwapRequestsController],
  providers: [SwapRequestsService, SwapRequestsRepository],
  exports: [SwapRequestsService],
})
export class SwapRequestsModule {}
