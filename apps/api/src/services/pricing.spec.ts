import { PricingModel, Prisma } from '@prisma/client';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { assertQuantityInRange, calculateEstimatedPrice, calculateFlatPrice, calculatePrice } from './pricing';

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

describe('calculateFlatPrice', () => {
  it('multiplies the flat price by quantity (package count, not per-1000 units)', () => {
    const result = calculateFlatPrice(new Prisma.Decimal('150.00'), 2);
    expect(result.toString()).toBe('300');
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateFlatPrice(new Prisma.Decimal('9.995'), 1);
    expect(result.toString()).toBe('10');
  });
});

describe('calculatePrice', () => {
  it('uses the per-thousand calculation for PER_THOUSAND', () => {
    const result = calculatePrice(PricingModel.PER_THOUSAND, new Prisma.Decimal('10.00'), null, 500);
    expect(result.toString()).toBe('5');
  });

  it('uses the flat calculation for FLAT', () => {
    const result = calculatePrice(PricingModel.FLAT, null, new Prisma.Decimal('150.00'), 2);
    expect(result.toString()).toBe('300');
  });

  it('throws if PER_THOUSAND but pricePerThousand is missing', () => {
    expect(() => calculatePrice(PricingModel.PER_THOUSAND, null, null, 500)).toThrow(
      InternalServerErrorException,
    );
  });

  it('throws if FLAT but flatPrice is missing', () => {
    expect(() => calculatePrice(PricingModel.FLAT, null, null, 2)).toThrow(InternalServerErrorException);
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
