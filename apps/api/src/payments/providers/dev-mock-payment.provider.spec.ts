import { BadRequestException } from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { DevMockPaymentProvider } from './dev-mock-payment.provider';

describe('DevMockPaymentProvider', () => {
  let provider: DevMockPaymentProvider;

  beforeEach(() => {
    provider = new DevMockPaymentProvider();
  });

  it('declares the DEV_MOCK provider', () => {
    expect(provider.provider).toBe(PaymentProvider.DEV_MOCK);
  });

  it('creates a payment with an unguessable providerRef and an in-app redirect', async () => {
    const result = await provider.createPayment({
      paymentId: 'pay-1',
      orderId: 'order-1',
      userId: 'user-1',
      amount: new Prisma.Decimal('10.00'),
    });
    expect(result.providerRef).toMatch(/^dev-mock-pay-/);
    expect(result.redirectUrl).toBe('/payments/pay-1/mock-checkout');
  });

  it('parses a valid webhook payload', () => {
    const event = provider.parseWebhookEvent(
      JSON.stringify({ providerRef: 'dev-mock-pay-abc', outcome: 'SUCCEEDED' }),
      {},
    );
    expect(event).toEqual({ providerRef: 'dev-mock-pay-abc', outcome: 'SUCCEEDED' });
  });

  it('rejects malformed JSON', () => {
    expect(() => provider.parseWebhookEvent('not json', {})).toThrow(BadRequestException);
  });

  it('rejects a payload with an invalid outcome', () => {
    expect(() =>
      provider.parseWebhookEvent(JSON.stringify({ providerRef: 'x', outcome: 'MAYBE' }), {}),
    ).toThrow(BadRequestException);
  });

  it('rejects a payload missing providerRef', () => {
    expect(() =>
      provider.parseWebhookEvent(JSON.stringify({ outcome: 'SUCCEEDED' }), {}),
    ).toThrow(BadRequestException);
  });
});
