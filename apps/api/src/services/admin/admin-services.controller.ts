import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ServicesService } from '../services.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';

@Controller('api/admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async list() {
    const services = await this.servicesService.adminList();
    return { services };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const service = await this.servicesService.adminGet(id);
    return { service };
  }

  @Post()
  async create(@Body() dto: CreateServiceDto) {
    const service = await this.servicesService.adminCreate(dto);
    return { service };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    const service = await this.servicesService.adminUpdate(id, dto);
    return { service };
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    const service = await this.servicesService.adminSetActive(id, true);
    return { service };
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const service = await this.servicesService.adminSetActive(id, false);
    return { service };
  }
}
