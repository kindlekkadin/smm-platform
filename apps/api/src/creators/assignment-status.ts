import { AssignmentStatus } from '@prisma/client';

/**
 * Fulfillment state machine for OrderAssignment — deliberately separate from
 * OrderStatus/isValidAdminTransition (orders/order-status.ts). Creators only
 * ever get restricted access to this map, never to the Order transition map.
 *
 * Validity (can from->to ever happen) is checked here. WHO may trigger a
 * given transition (creator vs admin) is enforced in OrderAssignmentsService,
 * not encoded in this map — e.g. OFFERED->ACCEPTED is creator-only while
 * OFFERED->CANCELLED is admin-only, even though both are valid edges.
 */
const ALLOWED_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.OFFERED]: [
    AssignmentStatus.ACCEPTED,
    AssignmentStatus.REJECTED,
    AssignmentStatus.CANCELLED,
  ],
  [AssignmentStatus.ACCEPTED]: [AssignmentStatus.COMPLETED, AssignmentStatus.CANCELLED],
  [AssignmentStatus.COMPLETED]: [],
  [AssignmentStatus.REJECTED]: [],
  [AssignmentStatus.CANCELLED]: [],
};

export function isValidAssignmentTransition(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
