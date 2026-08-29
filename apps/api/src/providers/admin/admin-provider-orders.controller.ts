import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderOrdersService } from '../provider-orders.service';
import { DispatchOrderDto } from '../dto/dispatch-order.dto';
import { CancelSubmissionDto } from '../dto/cancel-submission.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProviderOrdersController {
  constructor(private readonly providerOrders: ProviderOrdersService) {}

  @Post('orders/:orderId/provider-dispatch')
  async dispatch(@Param('orderId') orderId: string, @Body() dto: DispatchOrderDto) {
    const submission = await this.providerOrders.dispatch(orderId, dto);
    return { submission };
  }

  @Get('orders/:orderId/provider-submissions')
  async listForOrder(@Param('orderId') orderId: string) {
    const submissions = await this.providerOrders.listForOrder(orderId);
    return { submissions };
  }

  @Get('provider-submissions')
  async list() {
    const submissions = await this.providerOrders.adminList();
    return { submissions };
  }

  @Get('provider-submissions/:id')
  async get(@Param('id') id: string) {
    const submission = await this.providerOrders.adminGet(id);
    return { submission };
  }

  @Post('provider-submissions/:id/poll')
  async poll(@Param('id') id: string) {
    const submission = await this.providerOrders.poll(id);
    return { submission };
  }

  @Post('provider-submissions/:id/retry')
  async retry(@Param('id') id: string) {
    const submission = await this.providerOrders.retry(id);
    return { submission };
  }

  @Post('provider-submissions/:id/cancel')
  async cancel(@Param('id') id: string, @Body() dto: CancelSubmissionDto) {
    const submission = await this.providerOrders.cancel(id, dto.reason);
    return { submission };
  }
}
