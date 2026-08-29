export interface ProviderCredentials {
  apiEndpoint: string | null;
  /** Decrypted API key — never logged, never returned from any API response. */
  apiKey: string | null;
}

export interface SubmitOrderInput {
  submissionId: string;
  orderId: string;
  providerServiceId: string;
  quantity: number;
  targetIdentifier: string | null;
}

export interface SubmitOrderResult {
  providerOrderRef: string;
  externalStatus: string;
}

export type ProviderOutcome = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface ProviderStatusResult {
  externalStatus: string;
  outcome: ProviderOutcome;
}

export interface ProviderWebhookEvent {
  providerOrderRef: string;
  externalStatus: string;
  outcome: ProviderOutcome;
}

/**
 * Contract every fulfillment provider integration must implement.
 * ProviderOrdersService only ever talks to this interface — adding a real
 * provider later is an additive change (a new adapter class + registry
 * entry), not a rewrite.
 *
 * IMPORTANT: an adapter must never report COMPLETED as a side effect of
 * submitOrder() itself — completion is only ever reported by checkStatus()
 * or parseWebhookEvent(), both driven by an explicit external signal. This
 * keeps the system from ever fabricating a delivery outcome.
 */
export interface ProviderAdapter {
  readonly code: string;
  submitOrder(input: SubmitOrderInput, credentials: ProviderCredentials): Promise<SubmitOrderResult>;
  checkStatus(providerOrderRef: string, credentials: ProviderCredentials): Promise<ProviderStatusResult>;
  parseWebhookEvent(rawBody: string, headers: Record<string, string | undefined>): ProviderWebhookEvent;
}
