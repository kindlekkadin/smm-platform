import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { assertQuantityInRange, calculateEstimatedPrice } from './pricing';

describe('calculateEstimatedPrice', () => {
  it('calculates price for an exact multiple of 1000', () => {
    const result = calculateEstimatedPrice(new Prisma.Decimal('10.00'), 1000);
    expect(result.toString()).toBe('10');
  });

  it('calculates price for a fractional quantity', () => {
    const result = calculateEstimatedPrice(new Prisma.Decimal('10.00'), 500);
    expect(result.toString()).toBe('5');
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateEstimatedPrice(new Prisma.Decimal('9.99'), 333);
    // 9.99 * 333 / 1000 = 3.32667 -> 3.33
    expect(result.toString()).toBe('3.33');
  });

  it('never produces a JS floating-point artifact', () => {
    const result = calculateEstimatedPrice(new Prisma.Decimal('0.30'), 100);
    // 0.3 * 100 / 1000 = 0.03 exactly; floating point would risk 0.029999999999999995
    expect(result.toString()).toBe('0.03');
  });
});

describe('assertQuantityInRange', () => {
  it('accepts a quantity within range', () => {
    expect(() => assertQuantityInRange(500, 100, 1000)).not.toThrow();
  });

  it('rejects a quantity below the minimum', () => {
    expect(() => assertQuantityInRange(50, 100, 1000)).toThrow(BadRequestException);
  });

  it('rejects a quantity above the maximum', () => {
    expect(() => assertQuantityInRange(1500, 100, 1000)).toThrow(BadRequestException);
  });

  it('rejects a zero quantity', () => {
    expect(() => assertQuantityInRange(0, 1, 1000)).toThrow(BadRequestException);
  });

  it('rejects a non-integer quantity', () => {
    expect(() => assertQuantityInRange(50.5, 1, 1000)).toThrow(BadRequestException);
  });
});
