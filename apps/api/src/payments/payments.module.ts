import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { AdminPaymentsController } from './admin/admin-payments.controller';
import { PaymentsService } from './payments.service';
import {
  PAYMENT_PROVIDERS,
  PaymentProviderRegistry,
} from './providers/payment-provider-registry';
import { DevMockPaymentProvider } from './providers/dev-mock-payment.provider';
import { PaymentProviderAdapter } from './providers/payment-provider.interface';

@Module({
  controllers: [PaymentsController, PaymentsWebhookController, AdminPaymentsController],
  providers: [
    PaymentsService,
    PaymentProviderRegistry,
    DevMockPaymentProvider,
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (devMock: DevMockPaymentProvider): PaymentProviderAdapter[] => [
        devMock,
        // A real provider (Stripe/PayMongo/Xendit/etc.) is added here once
        // selected and configured — see PAYMENT_PROVIDER_INTEGRATION.md.
      ],
      inject: [DevMockPaymentProvider],
    },
  ],
})
export class PaymentsModule {}
