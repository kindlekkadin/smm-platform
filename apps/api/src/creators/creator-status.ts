import { CreatorVerificationStatus } from '@prisma/client';

/**
 * Admin-driven transitions for CreatorProfile.verificationStatus.
 * Moving a REJECTED profile back to PENDING happens only via the creator's
 * own re-application (see CreatorProfilesService.apply), not via this map —
 * an admin cannot directly force REJECTED -> PENDING.
 */
const ALLOWED_ADMIN_TRANSITIONS: Record<CreatorVerificationStatus, CreatorVerificationStatus[]> = {
  [CreatorVerificationStatus.PENDING]: [
    CreatorVerificationStatus.APPROVED,
    CreatorVerificationStatus.REJECTED,
  ],
  [CreatorVerificationStatus.APPROVED]: [CreatorVerificationStatus.SUSPENDED],
  [CreatorVerificationStatus.SUSPENDED]: [CreatorVerificationStatus.APPROVED],
  [CreatorVerificationStatus.REJECTED]: [],
};

export function isValidCreatorStatusTransition(
  from: CreatorVerificationStatus,
  to: CreatorVerificationStatus,
): boolean {
  return ALLOWED_ADMIN_TRANSITIONS[from].includes(to);
}
