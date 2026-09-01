import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateCreatorOfferingDto {
  @IsOptional()
  @IsPositive()
  creatorPricePerThousand?: number;

  @IsOptional()
  @IsPositive()
  creatorFlatPrice?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
