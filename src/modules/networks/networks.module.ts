import { Module } from '@nestjs/common';
import { NetworksService } from './networks.service';
import { NetworksController } from './networks.controller';
import { NetworksRepository } from './networks.repository';
import { NetworkCoordinatorsController } from './network-coordinators.controller';
import { NetworkCoordinatorsService } from './network-coordinators.service';

@Module({
  controllers: [NetworksController, NetworkCoordinatorsController],
  providers: [NetworksRepository, NetworksService, NetworkCoordinatorsService],
  exports: [NetworksRepository],
})
export class NetworksModule {}
