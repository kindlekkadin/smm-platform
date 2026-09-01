import { request } from './api';

export type ServiceCategory =
  | 'FOLLOWERS'
  | 'LIKES'
  | 'VIEWS'
  | 'COMMENTS'
  | 'ENGAGEMENT'
  | 'UGC_CONTENT'
  | 'SHOUTOUT'
  | 'AD_CAMPAIGN'
  | 'OTHER';
export type ServicePlatform = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'FACEBOOK' | 'X' | 'DEV_MOCK';
export type PricingModel = 'PER_THOUSAND' | 'FLAT';

// Organic promotional packages fulfilled by a human creator through the
// marketplace, priced FLAT (per package) rather than per 1,000 units.
export const ORGANIC_CATEGORIES: ServiceCategory[] = ['UGC_CONTENT', 'SHOUTOUT', 'AD_CAMPAIGN'];

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ServiceCategory;
  platform: ServicePlatform;
  pricingModel: PricingModel;
  pricePerThousand: string | null;
  flatPrice: string | null;
  minQuantity: number;
  maxQuantity: number;
  // Admin-set turnaround estimate (e.g. "1-3 hours"). Null means no estimate
  // was given — never invent one on the frontend.
  estimatedDelivery: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateResult {
  serviceId: string;
  quantity: number;
  pricingModel: PricingModel;
  pricePerThousand: string | null;
  flatPrice: string | null;
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
  pricingModel: PricingModel;
  pricePerThousand?: number;
  flatPrice?: number;
  minQuantity: number;
  maxQuantity: number;
  estimatedDelivery?: string;
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
