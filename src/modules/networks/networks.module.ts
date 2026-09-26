import { Module } from '@nestjs/common';
import { NetworksService } from './networks.service';
import { NetworksController } from './networks.controller';
import { NetworksRepository } from './networks.repository';

@Module({
  controllers: [NetworksController],
  providers: [NetworksRepository, NetworksService],
  exports: [NetworksRepository],
})
export class NetworksModule {}
