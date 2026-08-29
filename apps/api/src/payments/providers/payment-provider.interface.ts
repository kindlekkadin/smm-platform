import { PaymentProvider } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface CreatePaymentInput {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: Prisma.Decimal;
}

export interface CreatePaymentResult {
  /** Opaque reference from the provider (session/intent id). */
  providerRef: string;
  /**
   * Where the customer should go to complete payment. For a real provider
   * this is the provider's hosted checkout URL. For DEV_MOCK this is an
   * in-app route.
   */
  redirectUrl: string;
}

export interface PaymentWebhookEvent {
  providerRef: string;
  outcome: 'SUCCEEDED' | 'FAILED';
}

/**
 * Contract every payment provider integration must implement. PaymentsService
 * only ever talks to this interface — adding a real provider later is an
 * additive change (a new class + registry entry), not a rewrite.
 */
export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * Verify and parse an inbound webhook call into a normalized event. A real
   * provider implementation MUST verify a cryptographic signature here
   * before trusting the payload — see PAYMENT_PROVIDER_INTEGRATION.md.
   */
  parseWebhookEvent(rawBody: string, headers: Record<string, string | undefined>): PaymentWebhookEvent;
}
