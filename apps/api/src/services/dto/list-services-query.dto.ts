import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ServiceCategory, SocialPlatform } from '@prisma/client';

export class ListServicesQueryDto {
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
