import { request } from './api';
import { ServiceCategory, ServicePlatform } from './services-api';
import { SocialAccountStatus, SocialPlatform } from './social-accounts-api';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface Order {
  id: string;
  userId: string;
  quantity: number;
  targetIdentifier: string | null;
  unitPricePerThousand: string;
  totalPrice: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    name: string;
    slug: string;
    platform: ServicePlatform;
    category: ServiceCategory;
  };
  socialAccount: {
    id: string;
    platform: SocialPlatform;
    username: string;
    status: SocialAccountStatus;
  };
}

export function createOrder(input: {
  serviceId: string;
  socialAccountId: string;
  quantity: number;
  targetIdentifier?: string;
}) {
  return request<{ order: Order }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listOrders() {
  return request<{ orders: Order[] }>('/api/orders');
}

export function getOrder(id: string) {
  return request<{ order: Order }>(`/api/orders/${id}`);
}

export function cancelOrder(id: string) {
  return request<{ order: Order }>(`/api/orders/${id}/cancel`, { method: 'POST' });
}

// ---- Admin ----

export function adminListOrders() {
  return request<{ orders: Order[] }>('/api/admin/orders');
}
