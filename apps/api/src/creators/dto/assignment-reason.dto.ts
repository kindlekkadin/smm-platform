import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Shared shape for the optional reason on reject/cancel actions. */
export class AssignmentReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
