import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { OrderAssignmentsService } from './order-assignments.service';
import { AssignmentReasonDto } from './dto/assignment-reason.dto';

@Controller('api/creators/assignments')
@UseGuards(JwtAuthGuard)
export class CreatorAssignmentsController {
  constructor(private readonly assignments: OrderAssignmentsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const assignments = await this.assignments.listOwn(user.id);
    return { assignments };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const assignment = await this.assignments.getOwn(user.id, id);
    return { assignment };
  }

  @Patch(':id/accept')
  async accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const assignment = await this.assignments.accept(user.id, id);
    return { assignment };
  }

  @Patch(':id/reject')
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignmentReasonDto,
  ) {
    const assignment = await this.assignments.reject(user.id, id, dto.reason);
    return { assignment };
  }

  @Patch(':id/complete')
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const assignment = await this.assignments.complete(user.id, id);
    return { assignment };
  }
}
