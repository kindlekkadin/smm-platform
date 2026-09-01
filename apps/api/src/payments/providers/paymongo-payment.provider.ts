import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentProvider } from '@prisma/client';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  PaymentWebhookEvent,
} from './payment-provider.interface';

/**
 * PayMongo (GCash, Maya, QR Ph). Only registered by PaymentsModule when
 * PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET are both set — see
 * PAYMENT_PROVIDER_INTEGRATION.md. Until then this class is never
 * instantiated by the app and DEV_MOCK remains the only active provider.
 *
 * IMPORTANT — verify before trusting this with real money: this was written
 * against PayMongo's publicly documented Checkout Sessions + webhook signing
 * scheme, but has never been exercised against a live PayMongo account (no
 * credentials exist in this environment). Before going live, confirm against
 * PayMongo's current API docs / a sandbox account:
 *   - the exact response shape of POST /v1/checkout_sessions
 *   - the exact webhook event `type` string(s) for a completed checkout
 *     payment (this treats any event whose type ends in ".paid" as SUCCEEDED
 *     and any ending in ".failed" as FAILED)
 *   - that `reference_number` is echoed back on the webhook payload used to
 *     look up the local Payment row (see the comment on `providerRef` below)
 */
@Injectable()
export class PayMongoPaymentProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.PAYMONGO;

  private get secretKey(): string {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) {
      throw new InternalServerErrorException('PAYMONGO_SECRET_KEY is not configured');
    }
    return key;
  }

  private get webhookSecret(): string {
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('PAYMONGO_WEBHOOK_SECRET is not configured');
    }
    return secret;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    // Smallest currency unit (centavos) — PHP 100.00 is 10000, matching
    // PayMongo's documented amount format.
    const amountCentavos = input.amount.mul(100).toDecimalPlaces(0).toNumber();

    // Our own payment id, sent as PayMongo's reference_number and echoed
    // back on the payment resource / webhook payload. Used as providerRef
    // so lookup-by-providerRef in PaymentsService works without depending
    // on guessing PayMongo's internal checkout-session/payment id nesting.
    const providerRef = input.paymentId;

    const res = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_line_items: true,
            reference_number: providerRef,
            line_items: [
              {
                currency: 'PHP',
                amount: amountCentavos,
                name: input.orderId ? 'Order payment' : 'Wallet top-up',
                quantity: 1,
              },
            ],
            payment_method_types: ['gcash', 'paymaya', 'qrph'],
            success_url: `${webOrigin}/payments/${input.paymentId}/paymongo-return?status=success`,
            cancel_url: `${webOrigin}/payments/${input.paymentId}/paymongo-return?status=cancelled`,
          },
        },
      }),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(
        `PayMongo checkout session creation failed (${res.status})`,
      );
    }

    const body = (await res.json()) as { data?: { attributes?: { checkout_url?: string } } };
    const redirectUrl = body.data?.attributes?.checkout_url;
    if (!redirectUrl) {
      throw new InternalServerErrorException('PayMongo response missing checkout_url');
    }

    return { providerRef, redirectUrl };
  }

  parseWebhookEvent(rawBody: string, headers: Record<string, string | undefined>): PaymentWebhookEvent {
    this.verifySignature(rawBody, headers['paymongo-signature']);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }

    const type = extractPath(parsed, ['data', 'attributes', 'type']);
    const referenceNumber = extractPath(parsed, [
      'data',
      'attributes',
      'data',
      'attributes',
      'reference_number',
    ]);

    if (typeof type !== 'string' || typeof referenceNumber !== 'string') {
      throw new BadRequestException('Unrecognized PayMongo webhook payload shape');
    }

    if (type.endsWith('.paid')) {
      return { providerRef: referenceNumber, outcome: 'SUCCEEDED' };
    }
    if (type.endsWith('.failed')) {
      return { providerRef: referenceNumber, outcome: 'FAILED' };
    }
    throw new BadRequestException(`Unhandled PayMongo event type: ${type}`);
  }

  private verifySignature(rawBody: string, signatureHeader: string | undefined): void {
    if (!signatureHeader) {
      throw new BadRequestException('Missing Paymongo-Signature header');
    }

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key, value];
      }),
    );
    const timestamp = parts.t;
    // Live-mode signature; PayMongo also sends a test-mode `te=` signature
    // computed the same way against the test webhook secret.
    const signature = parts.li ?? parts.te;
    if (!timestamp || !signature) {
      throw new BadRequestException('Malformed Paymongo-Signature header');
    }

    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signature, 'hex');
    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new BadRequestException('Invalid PayMongo webhook signature');
    }
  }
}

function extractPath(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
