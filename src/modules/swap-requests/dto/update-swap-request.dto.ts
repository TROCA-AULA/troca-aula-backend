import { PartialType } from '@nestjs/swagger';
import { CreateSwapRequestDto } from './create-swap-request.dto';

export class UpdateSwapRequestDto extends PartialType(CreateSwapRequestDto) {}
