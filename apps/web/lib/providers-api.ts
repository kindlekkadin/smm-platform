import { request } from './api';

export type ProviderStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type ProviderSubmissionStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Provider {
  id: string;
  name: string;
  code: string;
  apiEndpoint: string | null;
  isActive: boolean;
  status: ProviderStatus;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderServiceMapping {
  id: string;
  providerId: string;
  serviceId: string;
  providerServiceId: string;
  providerPricePerThousand: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderOrderSubmission {
  id: string;
  orderId: string;
  providerId: string;
  providerServiceMappingId: string;
  providerOrderRef: string | null;
  externalStatus: string | null;
  status: ProviderSubmissionStatus;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Admin: providers ----

export function adminListProviders() {
  return request<{ providers: Provider[] }>('/api/admin/providers');
}

export function adminGetProvider(id: string) {
  return request<{ provider: Provider }>(`/api/admin/providers/${id}`);
}

export function adminCreateProvider(input: {
  name: string;
  code: string;
  apiEndpoint?: string;
  apiKey?: string;
  isActive?: boolean;
}) {
  return request<{ provider: Provider }>('/api/admin/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function adminUpdateProvider(
  id: string,
  input: Partial<{
    name: string;
    apiEndpoint: string;
    apiKey: string;
    isActive: boolean;
    status: ProviderStatus;
  }>,
) {
  return request<{ provider: Provider }>(`/api/admin/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---- Admin: provider service mappings ----

export function adminListProviderMappings(providerId?: string) {
  const query = providerId ? `?providerId=${providerId}` : '';
  return request<{ mappings: ProviderServiceMapping[] }>(`/api/admin/provider-mappings${query}`);
}

export function adminGetProviderMapping(id: string) {
  return request<{ mapping: ProviderServiceMapping }>(`/api/admin/provider-mappings/${id}`);
}

export function adminCreateProviderMapping(input: {
  providerId: string;
  serviceId: string;
  providerServiceId: string;
  providerPricePerThousand?: number;
  minQuantity?: number;
  maxQuantity?: number;
  active?: boolean;
}) {
  return request<{ mapping: ProviderServiceMapping }>('/api/admin/provider-mappings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function adminUpdateProviderMapping(
  id: string,
  input: Partial<{
    providerServiceId: string;
    providerPricePerThousand: number;
    minQuantity: number;
    maxQuantity: number;
    active: boolean;
  }>,
) {
  return request<{ mapping: ProviderServiceMapping }>(`/api/admin/provider-mappings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---- Admin: dispatch / submissions ----

export function adminDispatchOrderToProvider(orderId: string, providerServiceMappingId: string) {
  return request<{ submission: ProviderOrderSubmission }>(`/api/admin/orders/${orderId}/provider-dispatch`, {
    method: 'POST',
    body: JSON.stringify({ providerServiceMappingId }),
  });
}

export function adminListSubmissionsForOrder(orderId: string) {
  return request<{ submissions: ProviderOrderSubmission[] }>(`/api/admin/orders/${orderId}/provider-submissions`);
}

export function adminListSubmissions() {
  return request<{ submissions: ProviderOrderSubmission[] }>('/api/admin/provider-submissions');
}

export function adminGetSubmission(id: string) {
  return request<{ submission: ProviderOrderSubmission }>(`/api/admin/provider-submissions/${id}`);
}

export function adminPollSubmission(id: string) {
  return request<{ submission: ProviderOrderSubmission }>(`/api/admin/provider-submissions/${id}/poll`, {
    method: 'POST',
  });
}

export function adminRetrySubmission(id: string) {
  return request<{ submission: ProviderOrderSubmission }>(`/api/admin/provider-submissions/${id}/retry`, {
    method: 'POST',
  });
}

export function adminCancelSubmission(id: string, reason?: string) {
  return request<{ submission: ProviderOrderSubmission }>(`/api/admin/provider-submissions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
