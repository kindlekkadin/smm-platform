import { request } from './api';

export type ServiceCategory = 'FOLLOWERS' | 'LIKES' | 'VIEWS' | 'COMMENTS' | 'ENGAGEMENT' | 'OTHER';
export type ServicePlatform = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'FACEBOOK' | 'X' | 'DEV_MOCK';

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ServiceCategory;
  platform: ServicePlatform;
  pricePerThousand: string;
  minQuantity: number;
  maxQuantity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateResult {
  serviceId: string;
  quantity: number;
  pricePerThousand: string;
  estimatedPrice: string;
}

export function listServices(filters?: {
  platform?: ServicePlatform;
  category?: ServiceCategory;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return request<{ services: Service[] }>(`/api/services${qs ? `?${qs}` : ''}`);
}

export function getService(id: string) {
  return request<{ service: Service }>(`/api/services/${id}`);
}

export function estimatePrice(id: string, quantity: number) {
  return request<EstimateResult>(`/api/services/${id}/estimate?quantity=${quantity}`);
}

// ---- Admin ----

export interface CreateServiceInput {
  name: string;
  slug: string;
  description: string;
  category: ServiceCategory;
  platform: ServicePlatform;
  pricePerThousand: number;
  minQuantity: number;
  maxQuantity: number;
}

export function adminListServices() {
  return request<{ services: Service[] }>('/api/admin/services');
}

export function adminCreateService(input: CreateServiceInput) {
  return request<{ service: Service }>('/api/admin/services', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function adminSetServiceActive(id: string, active: boolean) {
  return request<{ service: Service }>(`/api/admin/services/${id}/${active ? 'activate' : 'deactivate'}`, {
    method: 'PATCH',
  });
}
