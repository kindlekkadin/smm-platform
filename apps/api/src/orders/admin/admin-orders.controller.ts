import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrdersService } from '../orders.service';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';

@Controller('api/admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list() {
    const orders = await this.ordersService.adminList();
    return { orders };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const order = await this.ordersService.adminGet(id);
    return { order };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    const order = await this.ordersService.adminUpdateStatus(id, dto.status);
    return { order };
  }
}
