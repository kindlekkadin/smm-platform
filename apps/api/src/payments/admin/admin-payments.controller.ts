import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaymentsService } from '../payments.service';
import { RefundPaymentDto } from '../dto/refund-payment.dto';

@Controller('api/admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async list() {
    const payments = await this.paymentsService.adminList();
    return { payments };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const payment = await this.paymentsService.adminGet(id);
    return { payment };
  }

  @Post(':id/refund')
  async refund(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    const payment = await this.paymentsService.refund(id, dto.reason);
    return { payment };
  }
}
