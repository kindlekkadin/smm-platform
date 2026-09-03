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

export type WalletTransactionType = 'TOP_UP' | 'MANUAL_TOP_UP';
export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: string;
  status: WalletTransactionStatus;
  paymentId: string | null;
  referenceNumber: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ManualTopUpSettings {
  qrPhImageUrl: string | null;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  instructions: string | null;
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

export function getManualTopUpSettings() {
  return request<{ settings: ManualTopUpSettings | null }>('/api/manual-topup-settings');
}

export function submitManualTopUp(amount: number, referenceNumber: string) {
  return request<{ transaction: WalletTransaction }>('/api/wallet/manual-top-up', {
    method: 'POST',
    body: JSON.stringify({ amount, referenceNumber }),
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

// ---- Admin ----

export function adminListPendingManualTopUps() {
  return request<{
    transactions: (WalletTransaction & { user: { id: string; email: string; displayName: string } })[];
  }>('/api/admin/manual-top-ups');
}

export function adminApproveManualTopUp(id: string) {
  return request<{ transaction: WalletTransaction }>(`/api/admin/manual-top-ups/${id}/approve`, {
    method: 'PATCH',
  });
}

export function adminRejectManualTopUp(id: string, reason?: string) {
  return request<{ transaction: WalletTransaction }>(`/api/admin/manual-top-ups/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function adminGetManualTopUpSettings() {
  return request<{ settings: ManualTopUpSettings | null }>('/api/admin/manual-topup-settings');
}

export function adminUpdateManualTopUpSettings(settings: Partial<ManualTopUpSettings>) {
  return request<{ settings: ManualTopUpSettings }>('/api/admin/manual-topup-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
