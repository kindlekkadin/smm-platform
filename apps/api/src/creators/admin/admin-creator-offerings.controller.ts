import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatorOfferingsService } from '../creator-offerings.service';
import { AdminUpdateOfferingStatusDto } from '../dto/admin-update-offering-status.dto';

@Controller('api/admin/creator-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCreatorOfferingsController {
  constructor(private readonly offerings: CreatorOfferingsService) {}

  @Get()
  async list() {
    const offerings = await this.offerings.adminList();
    return { offerings };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const offering = await this.offerings.adminGet(id);
    return { offering };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: AdminUpdateOfferingStatusDto) {
    const offering = await this.offerings.adminUpdateStatus(id, dto);
    return { offering };
  }
}
