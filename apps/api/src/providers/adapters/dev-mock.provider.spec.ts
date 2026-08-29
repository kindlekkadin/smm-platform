import { BadRequestException } from '@nestjs/common';
import { DevMockProvider } from './dev-mock.provider';

describe('DevMockProvider', () => {
  let provider: DevMockProvider;

  beforeEach(() => {
    provider = new DevMockProvider();
  });

  it('declares the DEV_MOCK code', () => {
    expect(provider.code).toBe('DEV_MOCK');
  });

  it('submits an order with an unguessable ref and a queued status', async () => {
    const result = await provider.submitOrder(
      {
        submissionId: 'sub-1',
        orderId: 'order-1',
        providerServiceId: 'svc-external-1',
        quantity: 1000,
        targetIdentifier: '@example',
      },
      { apiEndpoint: null, apiKey: null },
    );
    expect(result.providerOrderRef).toMatch(/^dev-mock-order-/);
    expect(result.externalStatus).toBe('queued');
  });

  it('never reports progress on its own when polled', async () => {
    const result = await provider.checkStatus('dev-mock-order-abc', {
      apiEndpoint: null,
      apiKey: null,
    });
    expect(result).toEqual({ externalStatus: 'queued', outcome: 'IN_PROGRESS' });
  });

  it('parses a valid simulated webhook payload', () => {
    const event = provider.parseWebhookEvent(
      JSON.stringify({ providerOrderRef: 'dev-mock-order-abc', outcome: 'COMPLETED' }),
      {},
    );
    expect(event).toEqual({
      providerOrderRef: 'dev-mock-order-abc',
      externalStatus: 'COMPLETED',
      outcome: 'COMPLETED',
    });
  });

  it('rejects malformed JSON', () => {
    expect(() => provider.parseWebhookEvent('not json', {})).toThrow(BadRequestException);
  });

  it('rejects a payload with an invalid outcome', () => {
    expect(() =>
      provider.parseWebhookEvent(
        JSON.stringify({ providerOrderRef: 'x', outcome: 'MAYBE' }),
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a payload missing providerOrderRef', () => {
    expect(() =>
      provider.parseWebhookEvent(JSON.stringify({ outcome: 'COMPLETED' }), {}),
    ).toThrow(BadRequestException);
  });
});
