import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentProvider } from '@prisma/client';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  PaymentWebhookEvent,
} from './payment-provider.interface';

/**
 * DEVELOPMENT / TEST ONLY.
 *
 * No real payment provider has been selected for this project yet, and no
 * provider credentials exist in this environment. This adapter never moves
 * real money and never contacts any external payment service — it exists
 * purely to exercise PaymentsService and the order-confirmation flow end to
 * end. It must never be presented to users as a real payment method.
 *
 * Unlike a real provider, this adapter does NOT verify a cryptographic
 * webhook signature — `parseWebhookEvent` trusts the JSON body directly.
 * That is only acceptable because DEV_MOCK payments can never represent
 * real money; a real provider implementation MUST verify a signature
 * before trusting any webhook payload. See PAYMENT_PROVIDER_INTEGRATION.md.
 */
@Injectable()
export class DevMockPaymentProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.DEV_MOCK;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerRef = `dev-mock-pay-${randomUUID()}`;
    return {
      providerRef,
      redirectUrl: `/payments/${input.paymentId}/mock-checkout`,
    };
  }

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).providerRef !== 'string' ||
      ((parsed as Record<string, unknown>).outcome !== 'SUCCEEDED' &&
        (parsed as Record<string, unknown>).outcome !== 'FAILED')
    ) {
      throw new BadRequestException('Invalid webhook event: expected { providerRef, outcome }');
    }

    const { providerRef, outcome } = parsed as { providerRef: string; outcome: 'SUCCEEDED' | 'FAILED' };
    return { providerRef, outcome };
  }
}
