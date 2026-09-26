import { Injectable } from '@nestjs/common';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { NetworksRepository } from './networks.repository';

@Injectable()
export class NetworksService {
  constructor(private readonly networksRepository: NetworksRepository) {}

  create(createNetworkDto: CreateNetworkDto) {
    return this.networksRepository.create(createNetworkDto);
  }

  findAll() {
    return this.networksRepository.findAll();
  }

  findOne(id: number) {
    return this.networksRepository.findOne(id);
  }

  update(id: number, updateNetworkDto: UpdateNetworkDto) {
    return this.networksRepository.update(id, updateNetworkDto);
  }
}
