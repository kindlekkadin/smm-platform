# Adding a real payment provider

As of Phase 5, the only always-active provider is `DevMockPaymentProvider`
(`provider: DEV_MOCK`). It never contacts any external service and never
represents real money — it exists purely to exercise order confirmation,
refunds, and the webhook flow end to end.

## PayMongo — implemented, but inactive without real credentials

`PayMongoPaymentProvider` (`providers/paymongo-payment.provider.ts`) exists
and covers GCash, Maya, and QR Ph via PayMongo's Checkout Sessions API. It
is only registered in `PaymentsModule`'s `PAYMENT_PROVIDERS` factory — and
therefore only ever selected by `PaymentsService.resolveActiveProvider()` —
when **both** `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` are set in
the environment. No credentials configured means DEV_MOCK remains the only
active provider for both order payments and wallet top-ups, exactly as
before.

**This has never been exercised against a live PayMongo account** — no
credentials exist in this environment, so it was written against PayMongo's
publicly documented API shape and webhook signing scheme, not verified
end-to-end. Before adding real keys, re-check against current PayMongo
docs / a sandbox account:
- the exact response shape of `POST /v1/checkout_sessions`,
- the webhook event `type` string(s) for a completed checkout payment (the
  adapter currently treats any type ending in `.paid` as success and
  `.failed` as failure),
- that `reference_number` (set to our own `Payment.id` at checkout-session
  creation) is actually echoed back on the webhook payload at the path the
  adapter reads it from — that's the field used to look up the local
  `Payment` row, chosen specifically to avoid depending on PayMongo's own
  internal id nesting.

## Xendit and others — not built

No other provider has been selected or implemented. `PaymentProvider`
reserves the shape for one; adding it doesn't require touching
`PaymentsService`, the controllers, or the schema.

## What's required before a real provider can be added

1. **A merchant/business account with the chosen provider**, yielding an API
   key/secret and a webhook signing secret.
2. **Credentials stored server-side only** (e.g. `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET` in `.env`) — never sent to the frontend.
3. **A publicly reachable webhook URL** in production (`/api/payments/webhooks/:provider`
   already exists and is provider-agnostic — no route changes needed).

## What to implement

1. A new class implementing `PaymentProviderAdapter` (see
   `providers/payment-provider.interface.ts`), e.g. `providers/stripe.provider.ts`:
   - `createPayment(input)` creates a real Checkout Session / Payment Intent
     via the provider's SDK and returns its hosted `redirectUrl` and a
     `providerRef` (the session/intent id) — exactly like `DevMockPaymentProvider`
     does today, just backed by a real API call.
   - `parseWebhookEvent(rawBody, headers)` **must verify the provider's
     signature** (e.g. Stripe's `stripe.webhooks.constructEvent` using the
     `Stripe-Signature` header and the raw, unparsed request body — this is
     exactly why the webhook controller reads `req.rawBody` instead of the
     JSON-parsed body) before trusting the payload, then normalize it to
     `{ providerRef, outcome: 'SUCCEEDED' | 'FAILED' }`.
2. Register the new adapter in `PaymentsModule`'s `PAYMENT_PROVIDERS`
   factory. `PaymentsService`, the controllers, and the frontend do not need
   to change — they already operate purely against the
   `PaymentProviderAdapter` interface and the `PaymentProvider` enum.
3. Pick which provider `PaymentsService.initiate()` uses (currently
   hardcoded to `DEV_MOCK` since it's the only one). Once a real provider
   exists this becomes a simple config value, not a design change.

## Refunds

`POST /api/admin/payments/:id/refund` only flips the local `Payment` record
to `REFUNDED` today — it does not call any provider API, because there is no
real payment to reverse. A real provider's refund path should call the
provider's refund API from inside that same admin endpoint before (or
instead of) updating the local record, so the local status always reflects
what actually happened with the provider.
