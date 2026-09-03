import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/public-user';
import { ManualTopUpsService } from '../manual-topups.service';
import { RejectManualTopUpDto } from '../dto/reject-manual-topup.dto';
import { UpdateManualTopUpSettingsDto } from '../dto/update-manual-topup-settings.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminManualTopUpsController {
  constructor(private readonly manualTopUps: ManualTopUpsService) {}

  @Get('manual-top-ups')
  async listPending() {
    const transactions = await this.manualTopUps.adminListPending();
    return { transactions };
  }

  @Patch('manual-top-ups/:id/approve')
  async approve(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    const transaction = await this.manualTopUps.adminApprove(id, admin.id);
    return { transaction };
  }

  @Patch('manual-top-ups/:id/reject')
  async reject(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectManualTopUpDto,
  ) {
    const transaction = await this.manualTopUps.adminReject(id, admin.id, dto.reason);
    return { transaction };
  }

  @Get('manual-topup-settings')
  async getSettings() {
    const settings = await this.manualTopUps.getSettings();
    return { settings };
  }

  @Put('manual-topup-settings')
  async updateSettings(@Body() dto: UpdateManualTopUpSettingsDto) {
    const settings = await this.manualTopUps.adminUpdateSettings(dto);
    return { settings };
  }
}
