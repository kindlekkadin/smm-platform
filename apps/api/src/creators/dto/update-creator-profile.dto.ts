import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
