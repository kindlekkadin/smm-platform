import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { SocialPlatform } from '@prisma/client';

export class AnalyticsFiltersDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;
}
