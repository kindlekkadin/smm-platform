import { BadRequestException, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ProviderOrdersService } from './provider-orders.service';

/**
 * Public webhook receiver — a real provider calls this unauthenticated
 * (authenticity is proven by a signature the adapter verifies, not a
 * session cookie). DEV_MOCK's adapter does not verify a signature and is
 * the only path by which a mock submission's status can ever change; see
 * DevMockProvider's class comment and PROVIDER_INTEGRATION.md.
 */
@Controller('api/providers/webhooks')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class ProviderWebhookController {
  constructor(private readonly providerOrders: ProviderOrdersService) {}

  @Post(':code')
  async handle(
    @Param('code') code: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const rawBody = req.rawBody?.toString('utf-8');
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    const submission = await this.providerOrders.handleWebhook(code, rawBody, headers);
    return { received: true, status: submission.status };
  }
}
