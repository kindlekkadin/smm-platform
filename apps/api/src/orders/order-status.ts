import { OrderStatus } from '@prisma/client';

/**
 * Explicit, validated state machine for admin status transitions. Anything
 * not listed as reachable from the current status is rejected. Terminal
 * states (COMPLETED, CANCELLED, FAILED) have no outgoing transitions.
 */
const ALLOWED_ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.FAILED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [],
};

export function isValidAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_ADMIN_TRANSITIONS[from].includes(to);
}

/** The only status a customer may cancel from in V1. */
export const CUSTOMER_CANCELLABLE_STATUS = OrderStatus.PENDING;
