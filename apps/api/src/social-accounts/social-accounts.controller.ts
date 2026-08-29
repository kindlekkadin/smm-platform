import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { SocialAccountsService } from './social-accounts.service';
import { CompleteConnectionDto } from './dto/complete-connection.dto';

@Controller('api/social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const accounts = await this.socialAccountsService.list(user.id);
    return { accounts };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const account = await this.socialAccountsService.get(user.id, id);
    return { account };
  }

  @Post(':platform/connect')
  async initiateConnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform') platform: string,
  ) {
    return this.socialAccountsService.initiateConnect(user.id, platform);
  }

  @Post(':platform/connect/complete')
  async completeConnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform') platform: string,
    @Body() dto: CompleteConnectionDto,
  ) {
    const account = await this.socialAccountsService.completeConnect(user.id, platform, dto);
    return { account };
  }

  @Delete(':id')
  async disconnect(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const account = await this.socialAccountsService.disconnect(user.id, id);
    return { account };
  }
}
