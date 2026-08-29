import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProvidersService } from '../providers.service';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';

@Controller('api/admin/providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  async create(@Body() dto: CreateProviderDto) {
    const provider = await this.providersService.create(dto);
    return { provider };
  }

  @Get()
  async list() {
    const providers = await this.providersService.list();
    return { providers };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const provider = await this.providersService.get(id);
    return { provider };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    const provider = await this.providersService.update(id, dto);
    return { provider };
  }
}
