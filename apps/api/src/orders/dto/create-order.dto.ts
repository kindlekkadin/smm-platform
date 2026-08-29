import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  serviceId!: string;

  @IsUUID()
  socialAccountId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetIdentifier?: string;
}
