import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderAdapter } from './payment-provider.interface';

export const PAYMENT_PROVIDERS = 'PAYMENT_PROVIDERS';

/**
 * Looks up the PaymentProviderAdapter for a given provider. Adding a real
 * provider means adding a new adapter class and listing it in
 * PaymentsModule's PAYMENT_PROVIDERS factory — nothing else in the app needs
 * to change.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<PaymentProvider, PaymentProviderAdapter>;

  constructor(@Inject(PAYMENT_PROVIDERS) providers: PaymentProviderAdapter[]) {
    this.providers = new Map(providers.map((provider) => [provider.provider, provider]));
  }

  get(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw new NotImplementedException(
        `The ${provider} payment provider is not yet configured in this environment`,
      );
    }
    return adapter;
  }

  has(provider: PaymentProvider): boolean {
    return this.providers.has(provider);
  }
}
