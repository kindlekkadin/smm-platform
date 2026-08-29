import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
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
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
