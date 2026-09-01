import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PricingModel, ServiceCategory, SocialPlatform } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case (e.g. instagram-followers)',
  })
  @MaxLength(160)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsEnum(PricingModel)
  pricingModel!: PricingModel;

  // Required when pricingModel is PER_THOUSAND, ignored otherwise.
  @ValidateIf((o: CreateServiceDto) => o.pricingModel === PricingModel.PER_THOUSAND)
  @IsPositive()
  pricePerThousand?: number;

  // Required when pricingModel is FLAT, ignored otherwise.
  @ValidateIf((o: CreateServiceDto) => o.pricingModel === PricingModel.FLAT)
  @IsPositive()
  flatPrice?: number;

  @IsInt()
  @IsPositive()
  minQuantity!: number;

  @IsInt()
  @IsPositive()
  maxQuantity!: number;

  // Human-readable turnaround estimate (e.g. "1-3 hours"), set by an admin —
  // never inferred or guessed by the app. Shown as "Varies" when absent.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  estimatedDelivery?: string;
}
