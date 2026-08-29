import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(user.id, dto);
    return { order };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const orders = await this.ordersService.list(user.id);
    return { orders };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const order = await this.ordersService.get(user.id, id);
    return { order };
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const order = await this.ordersService.cancel(user.id, id);
    return { order };
  }
}
