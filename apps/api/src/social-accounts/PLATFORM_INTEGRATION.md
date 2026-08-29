# Adding a real social platform integration

As of Phase 2, the only registered provider is `DevMockProvider` (`platform: DEV_MOCK`).
No real platform (Instagram, TikTok, YouTube, Facebook, X) is integrated, because this
environment has no registered developer app / OAuth client credentials for any of them.
`SocialPlatform` already reserves enum values for these platforms so the schema doesn't
need to change when one is added — only the pieces below do.

## What's required before a real provider can be added

1. **A registered developer app with the platform**, which yields:
   - a client ID and client secret
   - an approved OAuth redirect URI (pointing at this API, e.g. `https://api.example.com/api/social-accounts/instagram/callback`)
   - the specific scopes needed (read profile, read insights, etc.)
2. **Credentials stored server-side only**, e.g. `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET`
   in `.env` (never committed, never sent to the frontend).
3. **Compliance with the platform's developer terms** — most platforms require app review
   before non-test users can connect accounts.

## What to implement

1. A new class implementing `SocialPlatformProvider` (see
   `platforms/social-platform-provider.interface.ts`), e.g. `platforms/instagram.provider.ts`:
   - `initiateConnection(userId)` builds the platform's real OAuth authorization URL
     (with `client_id`, `redirect_uri`, `scope`, and a signed/random `state` bound to
     `userId`) and returns it as `authorizationUrl`.
   - `completeConnection(userId, { state, code })` verifies `state`, exchanges `code`
     for an access token via the platform's token endpoint, fetches the account's
     profile info, and returns `ConnectedAccountData` — exactly like `DevMockProvider`
     does today, just backed by real HTTP calls instead of an in-memory map.
2. Register the new provider in `SocialAccountsModule`'s `SOCIAL_PLATFORM_PROVIDERS`
   factory. `SocialAccountsService`, the controller, and the frontend do not need to
   change — they already operate purely against the `SocialPlatformProvider` interface
   and the `SocialPlatform` enum.
3. If the OAuth flow needs a callback route distinct from `POST /:platform/connect/complete`
   (most real providers redirect the browser back with `?code=...&state=...` via GET),
   add a small controller route that receives that redirect and forwards to
   `completeConnect` — the service method itself does not change.

## Token storage

Tokens are already encrypted at rest via `TokenCipherService` (AES-256-GCM) before
`SocialAccountsService` persists them, and are never included in any API response
(see `public-social-account.ts`). The only thing that changes for a real provider is
that `accessToken` in `ConnectedAccountData` becomes a real OAuth token instead of a
random mock string — the encryption/storage path is unchanged.

`TokenCipherService`'s static-env-var key is explicitly a local-development
approach; production should replace it with a managed secret store / KMS.
