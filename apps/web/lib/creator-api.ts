import { request } from './api';

export type CreatorVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type CreatorOfferingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AssignmentStatus = 'OFFERED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type PayoutRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface CreatorProfile {
  id: string;
  userId: string;
  bio: string | null;
  verificationStatus: CreatorVerificationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorOffering {
  id: string;
  creatorProfileId: string;
  serviceId: string;
  creatorPricePerThousand: string;
  minQuantity: number;
  maxQuantity: number;
  notes: string | null;
  status: CreatorOfferingStatus;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAssignment {
  id: string;
  orderId: string;
  creatorProfileId: string;
  creatorOfferingId: string;
  creatorPricePerThousand: string;
  status: AssignmentStatus;
  assignedAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorEarning {
  id: string;
  creatorProfileId: string;
  orderAssignmentId: string;
  amount: string;
  payoutRequestId: string | null;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  creatorProfileId: string;
  amount: string;
  status: PayoutRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
}

// ---- Creator: profile ----

export function applyAsCreator(input: { bio?: string }) {
  return request<{ profile: CreatorProfile }>('/api/creators/apply', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMyCreatorProfile() {
  return request<{ profile: CreatorProfile }>('/api/creators/me');
}

export function updateMyCreatorProfile(input: { bio?: string }) {
  return request<{ profile: CreatorProfile }>('/api/creators/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---- Creator: offerings ----

export interface CreatorOfferingInput {
  serviceId: string;
  creatorPricePerThousand: number;
  minQuantity: number;
  maxQuantity: number;
  notes?: string;
}

export function createMyOffering(input: CreatorOfferingInput) {
  return request<{ offering: CreatorOffering }>('/api/creators/offerings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listMyOfferings() {
  return request<{ offerings: CreatorOffering[] }>('/api/creators/offerings');
}

export function getMyOffering(id: string) {
  return request<{ offering: CreatorOffering }>(`/api/creators/offerings/${id}`);
}

export function updateMyOffering(id: string, input: Partial<CreatorOfferingInput> & { active?: boolean }) {
  return request<{ offering: CreatorOffering }>(`/api/creators/offerings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---- Creator: assignments ----

export function listMyAssignments() {
  return request<{ assignments: OrderAssignment[] }>('/api/creators/assignments');
}

export function getMyAssignment(id: string) {
  return request<{ assignment: OrderAssignment }>(`/api/creators/assignments/${id}`);
}

export function acceptAssignment(id: string) {
  return request<{ assignment: OrderAssignment }>(`/api/creators/assignments/${id}/accept`, {
    method: 'PATCH',
  });
}

export function rejectAssignment(id: string, reason?: string) {
  return request<{ assignment: OrderAssignment }>(`/api/creators/assignments/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function completeAssignment(id: string) {
  return request<{ assignment: OrderAssignment }>(`/api/creators/assignments/${id}/complete`, {
    method: 'PATCH',
  });
}

// ---- Creator: earnings & payouts ----

export function getMyEarnings() {
  return request<{ balance: string; earnings: CreatorEarning[] }>('/api/creators/earnings');
}

export function requestPayout() {
  return request<{ payoutRequest: PayoutRequest }>('/api/creators/payouts', { method: 'POST' });
}

export function listMyPayouts() {
  return request<{ payoutRequests: PayoutRequest[] }>('/api/creators/payouts');
}

export function getMyPayout(id: string) {
  return request<{ payoutRequest: PayoutRequest }>(`/api/creators/payouts/${id}`);
}

// ---- Admin: creators ----

export function adminListCreators() {
  return request<{ profiles: CreatorProfile[] }>('/api/admin/creators');
}

export function adminGetCreator(id: string) {
  return request<{ profile: CreatorProfile }>(`/api/admin/creators/${id}`);
}

export function adminUpdateCreatorStatus(
  id: string,
  status: CreatorVerificationStatus,
  reason?: string,
) {
  return request<{ profile: CreatorProfile }>(`/api/admin/creators/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

// ---- Admin: creator offerings ----

export function adminListOfferings() {
  return request<{ offerings: CreatorOffering[] }>('/api/admin/creator-offerings');
}

export function adminGetOffering(id: string) {
  return request<{ offering: CreatorOffering }>(`/api/admin/creator-offerings/${id}`);
}

export function adminUpdateOfferingStatus(id: string, status: CreatorOfferingStatus) {
  return request<{ offering: CreatorOffering }>(`/api/admin/creator-offerings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---- Admin: order assignments ----

export function adminCreateAssignment(orderId: string, creatorOfferingId: string) {
  return request<{ assignment: OrderAssignment }>(`/api/admin/orders/${orderId}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ creatorOfferingId }),
  });
}

export function adminListAssignmentsForOrder(orderId: string) {
  return request<{ assignments: OrderAssignment[] }>(`/api/admin/orders/${orderId}/assignments`);
}

export function adminCancelAssignment(id: string, reason?: string) {
  return request<{ assignment: OrderAssignment }>(`/api/admin/order-assignments/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

// ---- Admin: payouts ----

export function adminListPayouts() {
  return request<{ payoutRequests: PayoutRequest[] }>('/api/admin/payouts');
}

export function adminGetPayout(id: string) {
  return request<{ payoutRequest: PayoutRequest }>(`/api/admin/payouts/${id}`);
}

export function adminUpdatePayoutStatus(id: string, status: PayoutRequestStatus, notes?: string) {
  return request<{ payoutRequest: PayoutRequest }>(`/api/admin/payouts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}
