// Empty on purpose: every API call is a relative /api/* path, proxied by
// next.config.ts's rewrite to the real API origin. This keeps the session
// cookie first-party from the browser's perspective — see next.config.ts.
export const API_URL = '';
