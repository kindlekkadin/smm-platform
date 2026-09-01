import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { PublicStatsController } from './public-stats/public-stats.controller';
import { AuthModule } from './auth/auth.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { CreatorsModule } from './creators/creators.module';
import { ProvidersModule } from './providers/providers.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // Pretty-printing spawns a worker thread via pino.transport() —
        // fine for a human watching a local terminal, but a real risk of
        // leaked handles/flaky teardown under Jest and unnecessary noise in
        // production. Only ever enabled for an actual local dev run (NODE_ENV
        // unset or explicitly 'development'), never 'test' or 'production'.
        transport:
          process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        genReqId: (req) => req.headers['x-request-id'] ?? randomUUID(),
        // Never let a cookie, bearer token, or password reach the logs.
        redact: {
          paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.body.password',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    // Global default: 100 requests/minute per IP. Individual routes (auth,
    // webhooks) tighten this further with their own @Throttle() override.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    SocialAccountsModule,
    ServicesModule,
    OrdersModule,
    PaymentsModule,
    CreatorsModule,
    ProvidersModule,
    AnalyticsModule,
  ],
  controllers: [AppController, HealthController, PublicStatsController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
