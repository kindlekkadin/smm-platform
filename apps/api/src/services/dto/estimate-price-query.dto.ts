import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class EstimatePriceQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;
}
