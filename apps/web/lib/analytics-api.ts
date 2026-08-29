import { request } from './api';
import { ServicePlatform } from './services-api';
import { OrderStatus } from './orders-api';

export type FulfillmentChannel = 'CREATOR' | 'PROVIDER' | 'UNFULFILLED';
export type FulfillmentStatus = 'REPORTED' | 'NONE';

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  serviceId?: string;
  platform?: ServicePlatform;
}

export interface AnalyticsOverview {
  orderCount: number;
  fulfilledOrderCount: number;
  grossRevenue: string;
  fulfillmentCost: string;
  netMargin: string;
  marginPercent: number;
  fulfillmentStatus: 'REPORTED';
  isVerified: false;
}

export interface AnalyticsGroup {
  key: string;
  orderCount: number;
  revenue: string;
  cost: string;
  margin: string;
  marginPercent: number;
}

export interface AnalyticsBreakdowns {
  byChannel: AnalyticsGroup[];
  byService: AnalyticsGroup[];
  byPlatform: AnalyticsGroup[];
}

export interface AnalyticsOrderLineItem {
  orderId: string;
  createdAt: string;
  orderStatus: OrderStatus;
  serviceId: string;
  serviceName: string;
  platform: ServicePlatform;
  quantity: number;
  revenue: string;
  cost: string;
  margin: string;
  channel: FulfillmentChannel;
  fulfillmentStatus: FulfillmentStatus;
  isVerified: false;
}

export interface AnalyticsOrdersPage {
  orders: AnalyticsOrderLineItem[];
  total: number;
  page: number;
  pageSize: number;
}

function toQueryString(params: object): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export function adminGetAnalyticsOverview(filters: AnalyticsFilters = {}) {
  return request<AnalyticsOverview>(`/api/admin/analytics/overview${toQueryString(filters)}`);
}

export function adminGetAnalyticsBreakdowns(filters: AnalyticsFilters = {}) {
  return request<AnalyticsBreakdowns>(`/api/admin/analytics/breakdowns${toQueryString(filters)}`);
}

export function adminGetAnalyticsOrders(
  filters: AnalyticsFilters & { page?: number; pageSize?: number } = {},
) {
  return request<AnalyticsOrdersPage>(`/api/admin/analytics/orders${toQueryString(filters)}`);
}
