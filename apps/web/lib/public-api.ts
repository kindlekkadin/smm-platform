import { request } from './api';

export interface PublicStats {
  availableServices: number;
  ordersProcessed: number;
  activeUsers: number;
}

export function getPublicStats() {
  return request<PublicStats>('/api/public/stats');
}
