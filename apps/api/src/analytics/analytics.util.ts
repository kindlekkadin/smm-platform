import { Prisma } from '@prisma/client';

export type FulfillmentChannel = 'CREATOR' | 'PROVIDER' | 'UNFULFILLED';

// Defensive precision cap — every input here is already an exact 2-decimal
// money value (from the DB or from calculateEstimatedPrice), so add/sub
// never actually introduces extra digits today, but this keeps it that way
// if that ever changes. Note this bounds the VALUE, not the string: like
// every other Decimal in this app (see Order.totalPrice, CreatorEarning.amount),
// serialization uses decimal.js's minimal-digit form (e.g. "8", not "8.00") —
// there is no trailing-zero padding anywhere in this codebase's JSON output.
export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

export function sumDecimal(values: Prisma.Decimal[]): Prisma.Decimal {
  return roundMoney(values.reduce((total, value) => total.add(value), new Prisma.Decimal(0)));
}

/** Percent, rounded to 2 decimal places. 0 revenue is reported as 0%, not NaN/Infinity. */
export function computeMarginPercent(revenue: Prisma.Decimal, netMargin: Prisma.Decimal): number {
  if (revenue.isZero()) {
    return 0;
  }
  return netMargin.div(revenue).mul(100).toDecimalPlaces(2).toNumber();
}

/**
 * An order can complete through at most one channel — dispatch/assignment
 * are both blocked once an order leaves CONFIRMED/PROCESSING, so this never
 * has to arbitrate between two real completions. Creator wins the
 * (unreachable in practice) tie only so the function is total.
 */
export function determineChannel(hasCompletedAssignment: boolean, hasCompletedSubmission: boolean): FulfillmentChannel {
  if (hasCompletedAssignment) return 'CREATOR';
  if (hasCompletedSubmission) return 'PROVIDER';
  return 'UNFULFILLED';
}
