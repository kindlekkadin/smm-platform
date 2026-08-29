/**
 * Builds a @Throttle() config for a route that's tighter than the app-wide
 * default because it's financially or otherwise sensitive to abuse.
 *
 * Relaxed under Jest (NODE_ENV=test, set automatically by Jest itself):
 * several e2e suites legitimately create dozens of orders/payments per run
 * while exercising unrelated business logic, and rate limiting isn't what
 * those tests are testing. Mirrors AuthController's established pattern for
 * the login/register throttle.
 */
export function sensitiveThrottle(limit: number, ttlMs = 60_000) {
  return {
    default: { limit: process.env.NODE_ENV === 'test' ? limit * 100 : limit, ttl: ttlMs },
  };
}
