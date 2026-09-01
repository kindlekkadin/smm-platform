import { Prisma, PricingModel } from '@prisma/client';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

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

/**
 * Fixed price per package (e.g. one UGC video, one sponsored post) times
 * quantity — quantity means "N packages", not "N units per thousand".
 */
export function calculateFlatPrice(
  flatPrice: Prisma.Decimal,
  quantity: number,
): Prisma.Decimal {
  return flatPrice.mul(quantity).toDecimalPlaces(2);
}

/**
 * Branches on pricingModel to pick the right calculation. Exactly one of
 * pricePerThousand/flatPrice is expected to be set, matching pricingModel —
 * that invariant is enforced by DTO/service-layer validation before this
 * runs, so a mismatch here indicates a programming error, not bad input.
 */
export function calculatePrice(
  pricingModel: PricingModel,
  pricePerThousand: Prisma.Decimal | null,
  flatPrice: Prisma.Decimal | null,
  quantity: number,
): Prisma.Decimal {
  if (pricingModel === PricingModel.FLAT) {
    if (!flatPrice) {
      throw new InternalServerErrorException('FLAT pricing requires a flat price');
    }
    return calculateFlatPrice(flatPrice, quantity);
  }
  if (!pricePerThousand) {
    throw new InternalServerErrorException('PER_THOUSAND pricing requires a price per thousand');
  }
  return calculateEstimatedPrice(pricePerThousand, quantity);
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
