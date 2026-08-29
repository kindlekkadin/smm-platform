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
import { ServiceCategory, SocialPlatform } from '@prisma/client';

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

  @IsOptional()
  @IsPositive()
  pricePerThousand?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxQuantity?: number;
}
