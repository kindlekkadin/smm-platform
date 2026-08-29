import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/public-user';
import { CreatorProfilesService } from '../creator-profiles.service';
import { AdminUpdateCreatorStatusDto } from '../dto/admin-update-creator-status.dto';

@Controller('api/admin/creators')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCreatorsController {
  constructor(private readonly creatorProfiles: CreatorProfilesService) {}

  @Get()
  async list() {
    const profiles = await this.creatorProfiles.adminList();
    return { profiles };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const profile = await this.creatorProfiles.adminGet(id);
    return { profile };
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdminUpdateCreatorStatusDto,
  ) {
    const profile = await this.creatorProfiles.adminUpdateStatus(id, dto, admin.id);
    return { profile };
  }
}
