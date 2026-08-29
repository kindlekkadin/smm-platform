import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { AnalyticsOrdersQueryDto } from './dto/analytics-orders-query.dto';

@Controller('api/admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async overview(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getOverview(filters);
  }

  @Get('breakdowns')
  async breakdowns(@Query() filters: AnalyticsFiltersDto) {
    return this.analyticsService.getBreakdowns(filters);
  }

  @Get('orders')
  async orders(@Query() query: AnalyticsOrdersQueryDto) {
    return this.analyticsService.getOrderLineItems(query);
  }
}
