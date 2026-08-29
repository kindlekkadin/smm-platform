import { BadRequestException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';

export function parsePaymentProvider(value: string): PaymentProvider {
  if ((Object.values(PaymentProvider) as string[]).includes(value)) {
    return value as PaymentProvider;
  }
  throw new BadRequestException(`Unknown payment provider: ${value}`);
}
