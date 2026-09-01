import type { NextConfig } from "next";

// Proxy every /api/* call through this app's own origin instead of hitting
// the API's origin directly from the browser. That makes the session
// cookie first-party — no third-party-cookie restriction (Safari's
// Intelligent Tracking Prevention, Chrome's progressive phase-out) can
// block it, regardless of the cookie's SameSite/Secure attributes, which
// control only whether a cookie is *sent* cross-site, not whether a
// browser accepts it as third-party in the first place. Falls back to the
// local API dev server when NEXT_PUBLIC_API_URL isn't set.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
