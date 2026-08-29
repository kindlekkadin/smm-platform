import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { EstimatePriceQueryDto } from './dto/estimate-price-query.dto';

@Controller('api/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async list(@Query() query: ListServicesQueryDto) {
    const services = await this.servicesService.list(query);
    return { services };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const service = await this.servicesService.get(id);
    return { service };
  }

  @Get(':id/estimate')
  async estimate(@Param('id') id: string, @Query() query: EstimatePriceQueryDto) {
    return this.servicesService.estimate(id, query.quantity);
  }
}
