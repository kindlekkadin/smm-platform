import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrderAssignmentsService } from '../order-assignments.service';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { AssignmentReasonDto } from '../dto/assignment-reason.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOrderAssignmentsController {
  constructor(private readonly assignments: OrderAssignmentsService) {}

  @Post('orders/:orderId/assignments')
  async create(@Param('orderId') orderId: string, @Body() dto: CreateAssignmentDto) {
    const assignment = await this.assignments.adminCreate(orderId, dto);
    return { assignment };
  }

  @Get('orders/:orderId/assignments')
  async listForOrder(@Param('orderId') orderId: string) {
    const assignments = await this.assignments.adminListForOrder(orderId);
    return { assignments };
  }

  @Patch('order-assignments/:id/cancel')
  async cancel(@Param('id') id: string, @Body() dto: AssignmentReasonDto) {
    const assignment = await this.assignments.adminCancel(id, dto.reason);
    return { assignment };
  }
}
