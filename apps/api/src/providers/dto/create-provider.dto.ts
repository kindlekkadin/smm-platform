import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  apiEndpoint?: string;

  /** Plaintext at the API boundary only — encrypted before storage, never echoed back. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
