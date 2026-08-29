import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreatorVerificationStatus } from '@prisma/client';

export class AdminUpdateCreatorStatusDto {
  @IsEnum(CreatorVerificationStatus)
  status!: CreatorVerificationStatus;

  /** Used as the rejectionReason when status is REJECTED; otherwise ignored. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
