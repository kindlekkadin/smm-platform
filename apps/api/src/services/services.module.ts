import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { AdminServicesController } from './admin/admin-services.controller';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController, AdminServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
