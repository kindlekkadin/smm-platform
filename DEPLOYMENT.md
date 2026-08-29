# Staging Deployment

Target stack: **Render** (NestJS API + managed Postgres) + **Vercel** (Next.js web). This mirrors the hosting recommendation from the original Phase 0 plan and reuses the health-check/logging work from Phase 9.

I can't click through Render's or Vercel's dashboards myself — provisioning live infrastructure needs your account and your explicit approval at each billing-relevant step. What I *have* done: built and ran the API's Docker image locally against a real Postgres to confirm it actually boots, migrates, and serves traffic before you deploy it anywhere (see the fixes that came out of that below). Everything past that is you, following this runbook.

## What staging does *not* change

This deploys **infrastructure**, not new capability. Every provider integration in this codebase is still `DEV_MOCK`-only:

- No real payment provider (see `apps/api/src/payments/PAYMENT_PROVIDER_INTEGRATION.md`)
- No real social platform OAuth (see `apps/api/src/social-accounts/PLATFORM_INTEGRATION.md`)
- No real automated fulfillment provider (see `apps/api/src/providers/PROVIDER_INTEGRATION.md`)

Staging validates that the *platform* is deployable and reachable over the internet — it does not make checkout, social login, or automated growth "real." Don't point real users or real money at this environment.

## Staging readiness audit

| Area | Finding | Status |
|---|---|---|
| Dockerfile for the API | Didn't exist | **Added** — `apps/api/Dockerfile`, built and boot-tested locally against real Postgres |
| pnpm workspace deploy | `pnpm deploy` needs `inject-workspace-packages=true`, which required a lockfile regeneration | **Fixed** — `.npmrc` added, `pnpm-lock.yaml` regenerated |
| Prisma Client in the deployed image | `pnpm deploy` re-links `node_modules` from its own store rather than copying the build stage's — the generated Prisma Client was silently missing, and the container crashed on boot (`Cannot find module '.prisma/client/default'`) | **Fixed** — Dockerfile now runs `prisma generate` a second time *inside* the deployed directory |
| Health checks | `/health/live`, `/health/ready` already exist (Phase 9) | Ready — used directly as Render's health check path |
| Cookie security | `secure` flag already tracks `NODE_ENV=production` (Phase 9 hardening) | Ready — just requires `NODE_ENV=production` to actually be set in the deploy env |
| CORS | `WEB_ORIGIN` env var already gates it | Ready — needs the real staging frontend URL once known |
| Migrations on deploy | Nothing ran `prisma migrate deploy` automatically | **Fixed** — baked into the Docker image's `CMD`, runs on every boot, no-ops if already current |
| Redis | `REDIS_URL` is documented in `.env.example` but **nothing in `src/` uses it** — no BullMQ, no Redis client, anywhere | **Deliberately not provisioned.** Provisioning a live Redis instance for code that doesn't touch it yet is cost and attack surface for nothing. See [Adding Redis later](#adding-redis-later) — it's one line once a real feature needs it. |
| CI/CD wiring | GitHub Actions runs tests only, no deploy step | Left as-is — Render and Vercel both auto-deploy from their own native GitHub integration on push, decoupled from the test workflow. Simpler than wiring deploy secrets into Actions. |
| First admin account | No self-registration path for `ADMIN` (by design) | Use `pnpm cli create-admin` from your machine against the staging `DATABASE_URL` — see Step 5 |

## Prerequisites

- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- This repo pushed to GitHub (already done) with both accounts connected to it

## Step 1 — Push the deployment config

The Dockerfile, `.npmrc`, `render.yaml`, and the regenerated `pnpm-lock.yaml` need to be committed and pushed before Render can see them. I've created/modified these locally:

- `apps/api/Dockerfile`
- `.dockerignore` (repo root)
- `.npmrc` (repo root)
- `pnpm-lock.yaml` (regenerated)
- `render.yaml` (repo root)
- `DEPLOYMENT.md` (this file)

I have not committed or pushed these — say the word when you want that done, same as every prior phase.

## Step 2 — Deploy the API + Postgres on Render

1. In the Render dashboard: **New → Blueprint**.
2. Connect the `smm-platform` GitHub repo. Render will detect `render.yaml` at the repo root and show a plan: one Postgres database (`smm-staging-postgres`) and one Docker web service (`smm-staging-api`).
3. Click through to create them. `render.yaml` uses Render's **free** plan for both services — no card required, but two tradeoffs worth knowing going in: the web service spins down after ~15 minutes idle and cold-starts (10s+) on the next request, and the free Postgres instance is auto-deleted after 90 days. Fine for evaluating staging deployability; revisit the plan before either of these needs to stay reliably up.
4. Render will start building the API image immediately using `apps/api/Dockerfile` with the repo root as build context — this is the exact build I already verified locally.
5. Two env vars on `smm-staging-api` need a manual value before the service can start (they're intentionally *not* auto-generated — see the table above):
   - `SOCIAL_TOKEN_ENCRYPTION_KEY` — generate one locally and paste it in:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
   - `WEB_ORIGIN` — leave a placeholder (`https://placeholder.example`) for now; you'll come back and fix this in Step 4 once the Vercel URL exists.
6. Wait for the deploy to go green. Render's health check hits `/health/ready` — if that passes, the API is live and reaching Postgres. On the free plan the first request after any idle period will be slow (cold start) — that's expected, not a failure.
7. Copy the API's public URL (something like `https://smm-staging-api.onrender.com`) — you'll need it in Step 3.

## Step 3 — Deploy the web app on Vercel

1. In the Vercel dashboard: **Add New → Project**, import the same GitHub repo.
2. Under **Root Directory**, select `apps/web` — this is a monorepo, and Vercel needs to know which app to build. No `vercel.json` needed; Vercel's zero-config Next.js detection handles the rest once the root directory is set correctly.
3. Add one environment variable before the first deploy:
   - `NEXT_PUBLIC_API_URL` = the Render API URL from Step 2 (e.g. `https://smm-staging-api.onrender.com`)

   This is a `NEXT_PUBLIC_*` var — Next.js bakes it into the client bundle at build time, so it must be set *before* you deploy, not after.
4. Deploy. Copy the resulting URL (e.g. `https://smm-platform.vercel.app`).

## Step 4 — Close the loop: point the API's CORS at the real frontend URL

Back in the Render dashboard, on `smm-staging-api` → Environment:

1. Update `WEB_ORIGIN` to the real Vercel URL from Step 3 (e.g. `https://smm-platform.vercel.app`) — no trailing slash.
2. Save. Render redeploys automatically on an env var change.

Until this is set correctly, the API's CORS policy will reject requests from the deployed frontend (by design — `main.ts`'s `enableCors({ origin: process.env.WEB_ORIGIN, credentials: true })`).

## Step 5 — Create the first admin account

There's no signup path for `ADMIN` by design (`RegisterDto` only allows `CUSTOMER`/`CREATOR`). Run the same CLI built in Phase 9 hardening, but pointed at the staging database instead of your local one. Render's Postgres dashboard has an **External Connection String** — copy it and run this from your own machine (never paste a password into a chat or a shell history you don't control):

```bash
cd apps/api
DATABASE_URL="<the external connection string from Render>" \
ADMIN_EMAIL="you@example.com" \
ADMIN_PASSWORD="a real, private password" \
ADMIN_DISPLAY_NAME="Staging Admin" \
pnpm cli create-admin
```

This connects directly and creates one `ADMIN` row — it doesn't touch the running API process.

## Step 6 — Verify

- `https://<your-render-url>/health/live` → `{"status":"ok",...}`
- `https://<your-render-url>/health/ready` → `{"status":"ok","database":"connected",...}`
- Visit the Vercel URL, log in with the admin account from Step 5, confirm `/admin/*` pages load and can reach the API (open the browser devtools network tab — requests to the Render URL should return 200s, not CORS errors)
- Run through one real order end-to-end (DEV_MOCK payment, DEV_MOCK social account) to confirm the full stack — frontend → API → Postgres — actually works together in this environment, not just that each piece boots

## Ongoing deploys

Both Render and Vercel auto-deploy on push to `main` once connected — no additional CI wiring needed. The existing GitHub Actions workflow (tests) and these two deploys are independent: a red test run doesn't block a deploy today. If that gap matters to you, the fix is making Render/Vercel deploy only from a branch that's gated by a required CI check on GitHub — worth doing before this stops being "staging."

## Adding Redis later

When a real feature needs it (background jobs via BullMQ, per the original Phase 0 plan), add this to `render.yaml`:

```yaml
services:
  - type: redis
    name: smm-staging-redis
    plan: starter
    ipAllowList: []
```

and reference it from `smm-staging-api`'s `envVars` with `fromService: { name: smm-staging-redis, type: redis, property: connectionString }` for `REDIS_URL`. That's the entire change — no code changes needed until something actually calls Redis.

## Environment variable reference

| Variable | Where | Value | Notes |
|---|---|---|---|
| `DATABASE_URL` | Render (API) | auto-filled from the Blueprint's database | Never set by hand |
| `NODE_ENV` | Render (API) | `production` | Required for the `secure` cookie flag to activate |
| `PORT` | Render (API) | `3001` | Matches `EXPOSE 3001` in the Dockerfile |
| `JWT_SECRET` | Render (API) | auto-generated by Render | No format requirement |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Render (API) | manual, 32 random bytes as base64 | Must decode to exactly 32 bytes — `TokenCipherService` throws otherwise |
| `WEB_ORIGIN` | Render (API) | the Vercel URL, no trailing slash | Gates CORS; wrong value = every browser request fails |
| `NEXT_PUBLIC_API_URL` | Vercel (web) | the Render API URL | Baked in at build time — changing it requires a redeploy, not just an env var save |
