import { PayoutRequestStatus } from '@prisma/client';

const ALLOWED_ADMIN_TRANSITIONS: Record<PayoutRequestStatus, PayoutRequestStatus[]> = {
  [PayoutRequestStatus.PENDING]: [PayoutRequestStatus.APPROVED, PayoutRequestStatus.REJECTED],
  [PayoutRequestStatus.APPROVED]: [PayoutRequestStatus.PAID],
  [PayoutRequestStatus.REJECTED]: [],
  [PayoutRequestStatus.PAID]: [],
};

export function isValidPayoutStatusTransition(
  from: PayoutRequestStatus,
  to: PayoutRequestStatus,
): boolean {
  return ALLOWED_ADMIN_TRANSITIONS[from].includes(to);
}
