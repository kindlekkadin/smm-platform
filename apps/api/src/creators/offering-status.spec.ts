import { CreatorOfferingStatus } from '@prisma/client';
import { isValidOfferingStatusTransition } from './offering-status';

describe('isValidOfferingStatusTransition', () => {
  it('allows PENDING -> APPROVED and PENDING -> REJECTED', () => {
    expect(
      isValidOfferingStatusTransition(CreatorOfferingStatus.PENDING, CreatorOfferingStatus.APPROVED),
    ).toBe(true);
    expect(
      isValidOfferingStatusTransition(CreatorOfferingStatus.PENDING, CreatorOfferingStatus.REJECTED),
    ).toBe(true);
  });

  it('allows APPROVED -> REJECTED (revocation)', () => {
    expect(
      isValidOfferingStatusTransition(CreatorOfferingStatus.APPROVED, CreatorOfferingStatus.REJECTED),
    ).toBe(true);
  });

  it('rejects any transition out of REJECTED (resubmission is a separate code path)', () => {
    expect(
      isValidOfferingStatusTransition(CreatorOfferingStatus.REJECTED, CreatorOfferingStatus.PENDING),
    ).toBe(false);
  });

  it('rejects APPROVED -> PENDING', () => {
    expect(
      isValidOfferingStatusTransition(CreatorOfferingStatus.APPROVED, CreatorOfferingStatus.PENDING),
    ).toBe(false);
  });
});
