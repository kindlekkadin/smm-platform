import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: is the process itself alive? No dependencies — an
  // orchestrator should restart the instance only on this failing, not on
  // a transient DB blip (that's what readiness is for).
  @Get('live')
  live() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  // Readiness: can this instance actually serve traffic right now? A cheap
  // SELECT 1 — safe to poll frequently, unlike the old implementation this
  // replaced (which created, read, and deleted a real ADMIN-role User row
  // on every single call).
  @Get('ready')
  async ready() {
    return this.checkDatabase();
  }

  // Kept for backward compatibility with anything already polling /health;
  // equivalent to /health/ready.
  @Get()
  async check() {
    return this.checkDatabase();
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', latencyMs: Date.now() - start };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
