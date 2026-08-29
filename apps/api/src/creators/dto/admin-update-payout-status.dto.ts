import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PayoutRequestStatus } from '@prisma/client';

export class AdminUpdatePayoutStatusDto {
  @IsEnum(PayoutRequestStatus)
  status!: PayoutRequestStatus;

  /** Used as rejectionReason when status is REJECTED; stored as adminNotes otherwise. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
