import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyCreatorDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
