import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PricingModel, ServiceCategory, SocialPlatform } from '@prisma/client';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case (e.g. instagram-followers)',
  })
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  // Whether this (or the price fields below) is required is determined
  // against the service's existing pricingModel in the service layer, since
  // an update is partial and may not resend pricingModel at all.
  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @IsOptional()
  @IsPositive()
  pricePerThousand?: number;

  @IsOptional()
  @IsPositive()
  flatPrice?: number;

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
  @MaxLength(60)
  estimatedDelivery?: string;
}
