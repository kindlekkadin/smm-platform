import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { CreatorProfilesService } from './creator-profiles.service';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';

@Controller('api/creators')
@UseGuards(JwtAuthGuard)
export class CreatorsController {
  constructor(private readonly creatorProfiles: CreatorProfilesService) {}

  @Post('apply')
  async apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyCreatorDto) {
    const profile = await this.creatorProfiles.apply(user.id, dto);
    return { profile };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.creatorProfiles.getOwnProfile(user.id);
    return { profile };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCreatorProfileDto) {
    const profile = await this.creatorProfiles.updateOwnProfile(user.id, dto);
    return { profile };
  }
}
