import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ProviderAdapter,
  ProviderCredentials,
  ProviderStatusResult,
  ProviderWebhookEvent,
  SubmitOrderInput,
  SubmitOrderResult,
} from './provider-adapter.interface';

/**
 * DEVELOPMENT / TEST ONLY.
 *
 * No real automated fulfillment provider is integrated in this environment —
 * see PROVIDER_INTEGRATION.md. This adapter never contacts any external
 * service and, critically, NEVER reports a delivery outcome on its own:
 *
 * - submitOrder() only registers an unguessable reference and a "queued"
 *   status. It does not simulate progress or completion.
 * - checkStatus() always reports "still queued, no change" — there is no
 *   real backend to poll, so polling a mock submission is honestly inert
 *   rather than fabricating progress.
 * - The ONLY way a mock submission's status ever changes is an explicit,
 *   clearly-labeled test call to the webhook route — mirroring
 *   DevMockPaymentProvider's simulate-only design. This is what stops the
 *   system from ever claiming a social-media action occurred that didn't.
 */
@Injectable()
export class DevMockProvider implements ProviderAdapter {
  readonly code = 'DEV_MOCK';

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    return {
      providerOrderRef: `dev-mock-order-${randomUUID()}`,
      externalStatus: 'queued',
    };
  }

  async checkStatus(): Promise<ProviderStatusResult> {
    // Honest no-op: a mock provider has no real progress to report.
    return { externalStatus: 'queued', outcome: 'IN_PROGRESS' };
  }

  parseWebhookEvent(rawBody: string): ProviderWebhookEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }

    const body = parsed as Record<string, unknown>;
    const validOutcomes = ['IN_PROGRESS', 'COMPLETED', 'FAILED'];
    if (
      typeof body.providerOrderRef !== 'string' ||
      typeof body.outcome !== 'string' ||
      !validOutcomes.includes(body.outcome)
    ) {
      throw new BadRequestException(
        'Invalid webhook event: expected { providerOrderRef, outcome: IN_PROGRESS|COMPLETED|FAILED }',
      );
    }

    return {
      providerOrderRef: body.providerOrderRef,
      externalStatus: typeof body.externalStatus === 'string' ? body.externalStatus : body.outcome,
      outcome: body.outcome as ProviderWebhookEvent['outcome'],
    };
  }
}

// Credentials param intentionally unused by the mock — keep the interface
// shape visible for future real adapters without triggering unused-var lint.
export type _Unused = ProviderCredentials;
