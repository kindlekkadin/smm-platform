import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectManualTopUpDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
