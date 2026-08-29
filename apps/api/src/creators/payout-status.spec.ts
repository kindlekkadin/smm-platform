import { PayoutRequestStatus } from '@prisma/client';
import { isValidPayoutStatusTransition } from './payout-status';

describe('isValidPayoutStatusTransition', () => {
  it('allows PENDING -> APPROVED and PENDING -> REJECTED', () => {
    expect(isValidPayoutStatusTransition(PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED)).toBe(
      true,
    );
    expect(isValidPayoutStatusTransition(PayoutRequestStatus.PENDING, PayoutRequestStatus.REJECTED)).toBe(
      true,
    );
  });

  it('allows APPROVED -> PAID', () => {
    expect(isValidPayoutStatusTransition(PayoutRequestStatus.APPROVED, PayoutRequestStatus.PAID)).toBe(true);
  });

  it('rejects skipping PENDING straight to PAID', () => {
    expect(isValidPayoutStatusTransition(PayoutRequestStatus.PENDING, PayoutRequestStatus.PAID)).toBe(false);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(isValidPayoutStatusTransition(PayoutRequestStatus.PAID, PayoutRequestStatus.PENDING)).toBe(false);
    expect(isValidPayoutStatusTransition(PayoutRequestStatus.REJECTED, PayoutRequestStatus.PENDING)).toBe(
      false,
    );
  });
});
