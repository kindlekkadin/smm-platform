import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
