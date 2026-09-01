import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { PaymentsService } from './payments.service';
import { TopUpDto } from './dto/top-up.dto';
import { sensitiveThrottle } from '../common/throttle/sensitive-throttle.util';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/payments')
  @Throttle(sensitiveThrottle(10))
  async initiate(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    const { payment, redirectUrl } = await this.paymentsService.initiate(user.id, orderId);
    return { payment, redirectUrl };
  }

  @Get('wallet')
  async getWallet(@CurrentUser() user: AuthenticatedUser) {
    const [balance, transactions] = await Promise.all([
      this.paymentsService.getWalletBalance(user.id),
      this.paymentsService.listWalletTransactions(user.id),
    ]);
    return { balance, transactions };
  }

  @Post('wallet/top-up')
  @Throttle(sensitiveThrottle(10))
  async topUp(@CurrentUser() user: AuthenticatedUser, @Body() dto: TopUpDto) {
    const { payment, redirectUrl } = await this.paymentsService.initiateTopUp(user.id, dto.amount);
    return { payment, redirectUrl };
  }

  @Get('orders/:orderId/payments')
  async listForOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    const payments = await this.paymentsService.listForOrder(user.id, orderId);
    return { payments };
  }

  @Get('payments/:id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const payment = await this.paymentsService.get(user.id, id);
    return { payment };
  }
}
