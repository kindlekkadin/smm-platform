import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCreatorOfferingDto {
  @IsUUID()
  serviceId!: string;

  // Exactly one of these is required, depending on the Service's own
  // pricingModel — enforced in the service layer once the Service is
  // loaded, since a DTO alone can't see the parent record.
  @IsOptional()
  @IsPositive()
  creatorPricePerThousand?: number;

  @IsOptional()
  @IsPositive()
  creatorFlatPrice?: number;

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
