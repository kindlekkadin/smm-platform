import { IsUUID } from 'class-validator';

export class DispatchOrderDto {
  @IsUUID()
  providerServiceMappingId!: string;
}
