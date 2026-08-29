import { CreatorOfferingStatus } from '@prisma/client';

/**
 * Admin-driven transitions for CreatorOffering.status. Moving a REJECTED
 * offering back to PENDING happens via the creator editing it (see
 * CreatorOfferingsService.update), not via this map.
 */
const ALLOWED_ADMIN_TRANSITIONS: Record<CreatorOfferingStatus, CreatorOfferingStatus[]> = {
  [CreatorOfferingStatus.PENDING]: [CreatorOfferingStatus.APPROVED, CreatorOfferingStatus.REJECTED],
  [CreatorOfferingStatus.APPROVED]: [CreatorOfferingStatus.REJECTED],
  [CreatorOfferingStatus.REJECTED]: [],
};

export function isValidOfferingStatusTransition(
  from: CreatorOfferingStatus,
  to: CreatorOfferingStatus,
): boolean {
  return ALLOWED_ADMIN_TRANSITIONS[from].includes(to);
}
