import { request } from './api';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type PaymentProvider = 'DEV_MOCK';

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  provider: PaymentProvider;
  providerRef: string;
  amount: string;
  status: PaymentStatus;
  failureReason: string | null;
  refundReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function initiatePayment(orderId: string) {
  return request<{ payment: Payment; redirectUrl: string }>(`/api/orders/${orderId}/payments`, {
    method: 'POST',
  });
}

export function getPayment(id: string) {
  return request<{ payment: Payment }>(`/api/payments/${id}`);
}

/**
 * Stands in for what a real payment provider's redirect page would do, then
 * call back via a signed webhook. Since DEV_MOCK never contacts a real
 * provider, the "mock checkout" page posts directly to the same webhook
 * route a real provider would call — see PAYMENT_PROVIDER_INTEGRATION.md.
 */
export function simulateWebhook(providerRef: string, outcome: 'SUCCEEDED' | 'FAILED') {
  return request<{ received: boolean; status: PaymentStatus }>('/api/payments/webhooks/DEV_MOCK', {
    method: 'POST',
    body: JSON.stringify({ providerRef, outcome }),
  });
}
