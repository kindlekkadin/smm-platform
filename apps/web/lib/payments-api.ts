import { request } from './api';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type PaymentProvider = 'DEV_MOCK' | 'PAYMONGO';
export type PaymentPurpose = 'ORDER_PAYMENT' | 'WALLET_TOP_UP';

export interface Payment {
  id: string;
  orderId: string | null;
  userId: string;
  purpose: PaymentPurpose;
  provider: PaymentProvider;
  providerRef: string;
  amount: string;
  status: PaymentStatus;
  failureReason: string | null;
  refundReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'TOP_UP';
  amount: string;
  paymentId: string | null;
  createdAt: string;
}

export function initiatePayment(orderId: string) {
  return request<{ payment: Payment; redirectUrl: string }>(`/api/orders/${orderId}/payments`, {
    method: 'POST',
  });
}

export function getPayment(id: string) {
  return request<{ payment: Payment }>(`/api/payments/${id}`);
}

export function getWallet() {
  return request<{ balance: string; transactions: WalletTransaction[] }>('/api/wallet');
}

export function initiateTopUp(amount: number) {
  return request<{ payment: Payment; redirectUrl: string }>('/api/wallet/top-up', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
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
