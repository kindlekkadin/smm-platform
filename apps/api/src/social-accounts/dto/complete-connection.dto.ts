import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteConnectionDto {
  @IsString()
  @MinLength(1)
  state!: string;

  /** Only meaningful for the DEV_MOCK provider. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mockUsername?: string;
}
