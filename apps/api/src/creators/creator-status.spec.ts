import { CreatorVerificationStatus } from '@prisma/client';
import { isValidCreatorStatusTransition } from './creator-status';

describe('isValidCreatorStatusTransition', () => {
  it('allows PENDING -> APPROVED', () => {
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.PENDING, CreatorVerificationStatus.APPROVED),
    ).toBe(true);
  });

  it('allows PENDING -> REJECTED', () => {
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.PENDING, CreatorVerificationStatus.REJECTED),
    ).toBe(true);
  });

  it('allows APPROVED -> SUSPENDED and back', () => {
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.APPROVED, CreatorVerificationStatus.SUSPENDED),
    ).toBe(true);
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.SUSPENDED, CreatorVerificationStatus.APPROVED),
    ).toBe(true);
  });

  it('rejects any transition out of REJECTED (reapplication is a separate code path)', () => {
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.REJECTED, CreatorVerificationStatus.PENDING),
    ).toBe(false);
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.REJECTED, CreatorVerificationStatus.APPROVED),
    ).toBe(false);
  });

  it('rejects skipping PENDING straight to SUSPENDED', () => {
    expect(
      isValidCreatorStatusTransition(CreatorVerificationStatus.PENDING, CreatorVerificationStatus.SUSPENDED),
    ).toBe(false);
  });
});
