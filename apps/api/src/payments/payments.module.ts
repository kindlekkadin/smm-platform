import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { AdminPaymentsController } from './admin/admin-payments.controller';
import { AdminManualTopUpsController } from './admin/admin-manual-topups.controller';
import { PaymentsService } from './payments.service';
import { ManualTopUpsService } from './manual-topups.service';
import {
  PAYMENT_PROVIDERS,
  PaymentProviderRegistry,
} from './providers/payment-provider-registry';
import { DevMockPaymentProvider } from './providers/dev-mock-payment.provider';
import { PayMongoPaymentProvider } from './providers/paymongo-payment.provider';
import { PaymentProviderAdapter } from './providers/payment-provider.interface';

@Module({
  controllers: [
    PaymentsController,
    PaymentsWebhookController,
    AdminPaymentsController,
    AdminManualTopUpsController,
  ],
  providers: [
    PaymentsService,
    ManualTopUpsService,
    PaymentProviderRegistry,
    DevMockPaymentProvider,
    PayMongoPaymentProvider,
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (
        devMock: DevMockPaymentProvider,
        payMongo: PayMongoPaymentProvider,
      ): PaymentProviderAdapter[] => [
        devMock,
        // Only registered — and therefore only ever selected or dispatched
        // to — once real credentials exist. No credentials configured means
        // no PayMongo entry here, and DEV_MOCK remains the only option, the
        // same as every other integration in this app.
        ...(process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_WEBHOOK_SECRET ? [payMongo] : []),
      ],
      inject: [DevMockPaymentProvider, PayMongoPaymentProvider],
    },
  ],
})
export class PaymentsModule {}
