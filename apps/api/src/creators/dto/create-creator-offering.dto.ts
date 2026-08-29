import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCreatorOfferingDto {
  @IsUUID()
  serviceId!: string;

  @IsPositive()
  creatorPricePerThousand!: number;

  @IsInt()
  @IsPositive()
  minQuantity!: number;

  @IsInt()
  @IsPositive()
  maxQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
