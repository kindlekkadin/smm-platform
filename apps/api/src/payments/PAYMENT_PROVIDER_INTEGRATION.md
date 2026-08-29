# Adding a real payment provider

As of Phase 5, the only registered provider is `DevMockPaymentProvider`
(`provider: DEV_MOCK`). It never contacts any external service and never
represents real money — it exists purely to exercise order confirmation,
refunds, and the webhook flow end to end.

## Why no real provider yet

No payment provider has been selected for this project. The original
platform plan called for comparing options available to a Philippines-based
business (Stripe, PayMongo, Xendit, DragonPay, PayPal, GCash/Maya) on fees,
PH payout availability, API capabilities, and KYB/verification requirements
— that decision was deliberately deferred and no provider credentials exist
in this environment. `PaymentProvider` reserves the shape for one; adding it
doesn't require touching `PaymentsService`, the controllers, or the schema.

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
