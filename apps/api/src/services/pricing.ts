import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * Deterministic V1 pricing: linear price-per-1,000-units. Uses Prisma's
 * Decimal (decimal.js under the hood) throughout so money is never
 * represented as a JS floating-point number.
 */
export function calculateEstimatedPrice(
  pricePerThousand: Prisma.Decimal,
  quantity: number,
): Prisma.Decimal {
  return pricePerThousand.mul(quantity).div(1000).toDecimalPlaces(2);
}

export function assertQuantityInRange(
  quantity: number,
  minQuantity: number,
  maxQuantity: number,
): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BadRequestException('Quantity must be a positive integer');
  }
  if (quantity < minQuantity) {
    throw new BadRequestException(`Quantity must be at least ${minQuantity}`);
  }
  if (quantity > maxQuantity) {
    throw new BadRequestException(`Quantity must be at most ${maxQuantity}`);
  }
}
