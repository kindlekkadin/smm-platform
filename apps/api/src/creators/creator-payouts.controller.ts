import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { CreatorEarningsService } from './creator-earnings.service';
import { CreatorPayoutsService } from './creator-payouts.service';

@Controller('api/creators')
@UseGuards(JwtAuthGuard)
export class CreatorPayoutsController {
  constructor(
    private readonly earnings: CreatorEarningsService,
    private readonly payouts: CreatorPayoutsService,
  ) {}

  @Get('earnings')
  async listEarnings(@CurrentUser() user: AuthenticatedUser) {
    return this.earnings.getOwnBalance(user.id);
  }

  @Post('payouts')
  async requestPayout(@CurrentUser() user: AuthenticatedUser) {
    const payoutRequest = await this.payouts.request(user.id);
    return { payoutRequest };
  }

  @Get('payouts')
  async listPayouts(@CurrentUser() user: AuthenticatedUser) {
    const payoutRequests = await this.payouts.listOwn(user.id);
    return { payoutRequests };
  }

  @Get('payouts/:id')
  async getPayout(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const payoutRequest = await this.payouts.getOwn(user.id, id);
    return { payoutRequest };
  }
}
