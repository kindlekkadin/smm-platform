import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProviderMappingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  providerServiceId?: string;

  @IsOptional()
  @IsPositive()
  providerPricePerThousand?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxQuantity?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
