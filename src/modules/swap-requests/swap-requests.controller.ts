import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SwapRequestsService } from './swap-requests.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { GetSwapRequestDto } from './dto/get-swap-request.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('swap-requests')
@UseGuards(AuthGuard)
export class SwapRequestsController {
  constructor(private readonly swapRequestsService: SwapRequestsService) {}

  @Post()
  create(@Body() createSwapRequestDto: CreateSwapRequestDto, @Request() req) {
    return this.swapRequestsService.create(createSwapRequestDto, req.user.id);
  }

  @Get()
  findAll(@Query() query: GetSwapRequestDto, @Request() req) {
    return this.swapRequestsService.findAll(query, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.swapRequestsService.findOne(+id);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Request() req) {
    return this.swapRequestsService.accept(+id, req.user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Request() req) {
    return this.swapRequestsService.reject(+id, req.user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.swapRequestsService.cancel(+id, req.user.id);
  }
}
