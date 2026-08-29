import { BadRequestException, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PaymentProvider } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { parsePaymentProvider } from './payment-provider.util';

/**
 * Public webhook receiver — real payment providers call this unauthenticated
 * (they prove authenticity via a signature the adapter verifies, not a
 * session cookie). DEV_MOCK's adapter does not verify a signature; see its
 * class comment and PAYMENT_PROVIDER_INTEGRATION.md for why that is only
 * acceptable for a provider that can never represent real money.
 */
@Controller('api/payments/webhooks')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':provider')
  async handle(
    @Param('provider') providerParam: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const provider: PaymentProvider = parsePaymentProvider(providerParam);
    const rawBody = req.rawBody?.toString('utf-8');
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    const payment = await this.paymentsService.handleWebhook(provider, rawBody, headers);
    return { received: true, status: payment.status };
  }
}
