import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const email = `healthcheck+${Date.now()}@internal.local`;

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash: 'unused',
        displayName: 'Health Check',
        role: 'ADMIN',
      },
    });

    const found = await this.prisma.user.findUniqueOrThrow({
      where: { id: created.id },
    });

    await this.prisma.user.delete({ where: { id: created.id } });

    return {
      status: 'ok',
      database: 'connected',
      userReadWrite: found.email === email ? 'ok' : 'mismatch',
    };
  }
}
