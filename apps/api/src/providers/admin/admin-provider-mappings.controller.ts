import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProvidersService } from '../providers.service';
import { CreateProviderMappingDto } from '../dto/create-provider-mapping.dto';
import { UpdateProviderMappingDto } from '../dto/update-provider-mapping.dto';

@Controller('api/admin/provider-mappings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProviderMappingsController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  async create(@Body() dto: CreateProviderMappingDto) {
    const mapping = await this.providersService.createMapping(dto);
    return { mapping };
  }

  @Get()
  async list(@Query('providerId') providerId?: string) {
    const mappings = await this.providersService.listMappings(providerId);
    return { mappings };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const mapping = await this.providersService.getMapping(id);
    return { mapping };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProviderMappingDto) {
    const mapping = await this.providersService.updateMapping(id, dto);
    return { mapping };
  }
}
