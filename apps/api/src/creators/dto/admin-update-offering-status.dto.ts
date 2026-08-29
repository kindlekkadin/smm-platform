import { IsEnum } from 'class-validator';
import { CreatorOfferingStatus } from '@prisma/client';

export class AdminUpdateOfferingStatusDto {
  @IsEnum(CreatorOfferingStatus)
  status!: CreatorOfferingStatus;
}
