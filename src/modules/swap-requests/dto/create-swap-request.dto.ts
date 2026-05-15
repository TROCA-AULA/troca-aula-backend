import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateSwapRequestDto {
  @IsInt()
  @IsNotEmpty()
  classId: number;

  @IsInt()
  @IsNotEmpty()
  targetId: number;
}
