import { Prisma } from '@prisma/client';
import { computeMarginPercent, determineChannel, roundMoney, sumDecimal } from './analytics.util';

describe('sumDecimal', () => {
  it('sums a list of decimals', () => {
    const result = sumDecimal([new Prisma.Decimal('10.50'), new Prisma.Decimal('4.25')]);
    expect(result.toString()).toBe('14.75');
  });

  it('returns 0 for an empty list', () => {
    expect(sumDecimal([]).toString()).toBe('0');
  });
});

describe('roundMoney', () => {
  it('caps the value at 2 decimal places without forcing string padding', () => {
    // decimal.js has no concept of trailing-zero padding — every Decimal in
    // this app (Order.totalPrice, CreatorEarning.amount, etc.) serializes
    // via its minimal-digit form, so "8" is the correct, consistent output
    // here, not "8.00".
    const value = new Prisma.Decimal('8.005');
    expect(roundMoney(value).toString()).toBe('8.01'); // rounds away extra precision
    expect(roundMoney(new Prisma.Decimal('20.00').sub(new Prisma.Decimal('12.00'))).toString()).toBe('8');
  });
});

describe('computeMarginPercent', () => {
  it('computes a positive margin percent', () => {
    expect(computeMarginPercent(new Prisma.Decimal('100'), new Prisma.Decimal('25'))).toBe(25);
  });

  it('computes a negative margin percent when cost exceeds revenue', () => {
    expect(computeMarginPercent(new Prisma.Decimal('100'), new Prisma.Decimal('-10'))).toBe(-10);
  });

  it('returns 0 rather than NaN/Infinity when revenue is 0', () => {
    expect(computeMarginPercent(new Prisma.Decimal('0'), new Prisma.Decimal('0'))).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(computeMarginPercent(new Prisma.Decimal('3'), new Prisma.Decimal('1'))).toBe(33.33);
  });
});

describe('determineChannel', () => {
  it('reports CREATOR when a completed assignment exists', () => {
    expect(determineChannel(true, false)).toBe('CREATOR');
  });

  it('reports PROVIDER when a completed submission exists', () => {
    expect(determineChannel(false, true)).toBe('PROVIDER');
  });

  it('reports UNFULFILLED when neither channel has completed', () => {
    expect(determineChannel(false, false)).toBe('UNFULFILLED');
  });

  it('prefers CREATOR on the (unreachable) case both are true', () => {
    expect(determineChannel(true, true)).toBe('CREATOR');
  });
});
