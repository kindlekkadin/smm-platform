import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateManualTopUpSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qrPhImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}
