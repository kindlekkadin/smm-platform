# Adding a real fulfillment provider

As of Phase 7, the only registered adapter is `DevMockProvider`
(`code: DEV_MOCK`). It never contacts any external service and never
represents a real social-media action — it exists purely to exercise
dispatch, status polling, webhook handling, retry, and cancellation end to
end.

## Why no real provider yet

No automated fulfillment provider has been selected or credentialed for
this project. `Provider` is a full admin-managed model precisely so that
choice doesn't require a schema or code rewrite — creating a `Provider` row
with a real `code`, `apiEndpoint`, and encrypted `apiKey`, then registering
a matching adapter, is the entire integration surface.

## The safety rule every adapter must follow

`ProviderAdapter.submitOrder()` must never itself report `COMPLETED` (or any
outcome beyond acknowledgement/queueing). Completion is only ever reported by
`checkStatus()` or `parseWebhookEvent()`, and only when the adapter has
received an explicit signal from the real external system that the
underlying action actually happened. This is what stops the platform from
ever fabricating growth — see `adapters/provider-adapter.interface.ts` and
`adapters/dev-mock.provider.ts` for the enforced shape.

## What's required before a real provider can be added

1. **A real account/API relationship with the provider**, yielding an API
   key/endpoint and (if it offers one) a webhook signing secret.
2. **Credentials stored encrypted** — `Provider.apiKeySecret` is already
   AES-256-GCM encrypted via `TokenCipherService`; never log or return the
   decrypted value from any API response.
3. **A publicly reachable webhook URL** in production
   (`/api/providers/webhooks/:code` already exists and is provider-agnostic
   — no route changes needed) if the provider supports push callbacks;
   otherwise rely on `checkStatus()` polling alone.

## What to implement

1. A new class implementing `ProviderAdapter` (see
   `adapters/provider-adapter.interface.ts`), e.g. `adapters/example.provider.ts`:
   - `submitOrder(input, credentials)` calls the provider's real order-creation
     API and returns its `providerOrderRef` and an initial `externalStatus`
     — never an outcome beyond acknowledgement.
   - `checkStatus(providerOrderRef, credentials)` calls the provider's real
     status API and maps its response to `{ externalStatus, outcome }`.
   - `parseWebhookEvent(rawBody, headers)` **must verify the provider's
     signature** if one is offered (using the raw, unparsed request body —
     this is exactly why the webhook controller reads `req.rawBody` instead
     of the JSON-parsed body) before trusting the payload.
2. Register the new adapter in `ProvidersModule`'s `PROVIDER_ADAPTERS`
   factory. `ProviderOrdersService`, the controllers, and the frontend do not
   need to change — they already operate purely against the
   `ProviderAdapter` interface and `Provider.code`.
3. Create the `Provider` row (via `/api/admin/providers`) with the matching
   `code`, and `ProviderServiceMapping` rows (via `/api/admin/provider-mappings`)
   mapping internal `Service`s to the provider's own service identifiers.

## Relationship to Phase 6 (Creator Marketplace)

Providers are an independent, second fulfillment channel alongside Phase 6's
human creator assignments. An admin chooses per-order which channel fulfills
it; `Order.status` (the customer-facing lifecycle from Phase 4) is advanced
by whichever channel is used, following the same rules either way — it is
never advanced backward, and `COMPLETED` is only ever reached from an
explicit, real completion signal (a creator's own action, or a provider's
`checkStatus`/webhook outcome).
