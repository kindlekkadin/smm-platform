import { IsEnum, IsInt, IsPositive, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ServiceCategory, SocialPlatform } from '@prisma/client';

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

  @IsPositive()
  pricePerThousand!: number;

  @IsInt()
  @IsPositive()
  minQuantity!: number;

  @IsInt()
  @IsPositive()
  maxQuantity!: number;
}
