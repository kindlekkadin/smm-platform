import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

const REGISTERABLE_ROLES = [UserRole.CUSTOMER, UserRole.CREATOR] as const;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsIn(REGISTERABLE_ROLES)
  role?: (typeof REGISTERABLE_ROLES)[number];
}
