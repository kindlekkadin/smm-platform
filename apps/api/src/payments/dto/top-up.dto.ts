import { IsPositive } from 'class-validator';

export class TopUpDto {
  @IsPositive()
  amount!: number;
}
