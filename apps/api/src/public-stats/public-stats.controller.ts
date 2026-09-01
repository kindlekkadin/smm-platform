import { Controller, Get } from '@nestjs/common';
import { OrderStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Public, unauthenticated, read-only aggregate counts for the marketing
// homepage's "live stats" row. Real counts only — never a fabricated or
// rounded-up number. Small today because this is a new platform; that's
// the honest number, not a reason to invent a bigger one.
@Controller('api/public/stats')
export class PublicStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const [availableServices, ordersProcessed, activeUsers] = await Promise.all([
      this.prisma.service.count({ where: { active: true } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    ]);
    return { availableServices, ordersProcessed, activeUsers };
  }
}
