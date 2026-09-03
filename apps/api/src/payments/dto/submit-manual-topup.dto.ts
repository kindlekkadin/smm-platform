import { IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitManualTopUpDto {
  @IsPositive()
  amount!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  referenceNumber!: string;
}
