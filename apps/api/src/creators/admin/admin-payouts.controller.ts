import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatorPayoutsService } from '../creator-payouts.service';
import { AdminUpdatePayoutStatusDto } from '../dto/admin-update-payout-status.dto';

@Controller('api/admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPayoutsController {
  constructor(private readonly payouts: CreatorPayoutsService) {}

  @Get()
  async list() {
    const payoutRequests = await this.payouts.adminList();
    return { payoutRequests };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const payoutRequest = await this.payouts.adminGet(id);
    return { payoutRequest };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: AdminUpdatePayoutStatusDto) {
    const payoutRequest = await this.payouts.adminUpdateStatus(id, dto);
    return { payoutRequest };
  }
}
