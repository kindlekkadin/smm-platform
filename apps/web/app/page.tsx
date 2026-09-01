'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError, login, register } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { PublicStats, getPublicStats } from '../lib/public-api';
import PublicHeader from '../components/PublicHeader';

const PLATFORMS = [
  { label: 'Instagram', glyph: 'IG' },
  { label: 'TikTok', glyph: 'TT' },
  { label: 'YouTube', glyph: 'YT' },
  { label: 'Facebook', glyph: 'FB' },
  { label: 'X', glyph: 'X' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Create an account', body: 'Sign up with your email — no password-sharing, no bots, real people only.' },
  { step: '2', title: 'Connect your account', body: 'Link the social account you want to grow before ordering.' },
  { step: '3', title: 'Choose a service & order', body: 'Pick a category, see the price up front, and submit — pay per order.' },
];

const BENEFITS = [
  { title: 'Real, human fulfillment', body: 'Every order is completed by a real, verified person or a genuine growth channel — never a bot.' },
  { title: 'Organic creator marketplace', body: 'UGC videos, shoutouts, and sponsored posts, hand-assigned to real creators.' },
  { title: 'Transparent pricing', body: 'The price you see before you order is the price you pay — no hidden tiers.' },
  { title: 'Self-serve support', body: 'Order rules and account help are documented right in the app.' },
];

const FAQS = [
  {
    q: 'What is an SMM Panel?',
    a: 'An SMM (social media marketing) panel is a dashboard where you order social media growth services — followers, likes, views, and more. A lot of panels resell bulk automated engagement; Hayathmanager doesn’t. Every order here is filled by a real person or a genuine growth channel.',
  },
  {
    q: 'Is this real engagement?',
    a: 'Yes. Every service is fulfilled by a real, verified person or a genuine growth channel. We don’t sell bots, fake accounts, or automated fake engagement — that’s a permanent rule of this platform, not a marketing line.',
  },
  {
    q: 'What types of SMM services can I find on your panel?',
    a: 'Real growth services — followers, likes, views, comments, and engagement — priced per 1,000 units, plus organic creator packages like UGC videos, shoutouts, and sponsored posts, priced per package.',
  },
  {
    q: 'How does pricing work?',
    a: 'Growth services are priced per 1,000 units. Organic packages — UGC videos, creator shoutouts, sponsored posts — are priced flat, per package. You always see the total before you submit.',
  },
  {
    q: 'Which platforms are supported?',
    a: 'Instagram, TikTok, YouTube, Facebook, and X today.',
  },
  {
    q: 'What is the average order completion time?',
    a: 'There’s no single platform-wide number — it depends entirely on the service. Each one lists its own estimated turnaround (Average Time) before you order.',
  },
  {
    q: 'How quickly will my order be completed?',
    a: 'Once your payment is confirmed, your order is handed off to a real person for fulfillment, so timing follows that service’s listed Average Time rather than a fixed guarantee.',
  },
  {
    q: 'How long does a paid order stay in the queue?',
    a: 'There’s no fixed queue SLA today — timing depends on the service and, for organic packages, on creator availability. Check the Average Time on the service you’re ordering for the best estimate.',
  },
  {
    q: 'Do you offer API support?',
    a: 'Not yet. Every order currently goes through the dashboard, the same for everyone — see the API page for the honest current state.',
  },
  {
    q: 'Will my money be returned to my balance if an order is cancelled?',
    a: 'Order payments and your account balance are separate today — there’s no way to pay for an order from your balance yet, so a refund doesn’t touch it. You can cancel any order yourself for free before you pay; once paid, cancellation isn’t self-service, and refunds are handled manually by an admin case by case. See our Refund Policy for the full picture.',
  },
];

const PLATFORM_SERVICE_COLUMNS: { platform: 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'FACEBOOK' | 'X'; label: string }[] = [
  { platform: 'INSTAGRAM', label: 'Instagram' },
  { platform: 'TIKTOK', label: 'TikTok' },
  { platform: 'YOUTUBE', label: 'YouTube' },
  { platform: 'FACEBOOK', label: 'Facebook' },
  { platform: 'X', label: 'X (Twitter)' },
];

// FOLLOWERS/LIKES/VIEWS/COMMENTS/ENGAGEMENT are the real ServiceCategory
// values this app supports — there's no "Shares" category in the schema, so
// Engagement stands in for it rather than linking to something that doesn't
// exist.
const SERVICE_CATEGORY_LINKS: { category: 'FOLLOWERS' | 'LIKES' | 'VIEWS' | 'COMMENTS' | 'ENGAGEMENT'; label: string }[] = [
  { category: 'FOLLOWERS', label: 'Followers' },
  { category: 'LIKES', label: 'Likes' },
  { category: 'VIEWS', label: 'Views' },
  { category: 'COMMENTS', label: 'Comments' },
  { category: 'ENGAGEMENT', label: 'Engagement' },
];

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      <p className="text-xs text-white/70 sm:text-sm">{label}</p>
    </div>
  );
}

function AuthCard() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, displayName, role: 'CUSTOMER' });
      await login({ email, password });
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-warm">
      <div className="mb-4 flex rounded-xl bg-muted p-1 text-sm font-medium">
        <button
          onClick={() => setTab('signin')}
          className={`flex-1 rounded-lg py-2 transition-colors ${tab === 'signin' ? 'bg-primary text-primary-foreground shadow-warm' : 'text-muted-foreground'}`}
        >
          Sign In
        </button>
        <button
          onClick={() => setTab('signup')}
          className={`flex-1 rounded-lg py-2 transition-colors ${tab === 'signup' ? 'bg-primary text-primary-foreground shadow-warm' : 'text-muted-foreground'}`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
        {tab === 'signup' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <input
            type="password"
            required
            minLength={tab === 'signup' ? 8 : undefined}
            autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition-all hover:brightness-105 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-border bg-card p-4 shadow-warm">
      <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
        <span className="flex items-center justify-between">
          {q}
          <span className="ml-2 text-muted-foreground transition-transform group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </details>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    void getPublicStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // Loading, or a logged-in user is about to be redirected — render nothing
  // to avoid a flash of the marketing page.
  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero + live stats + auth card */}
      <section className="bg-espresso text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:items-center">
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Hayathmanager — real growth services &amp; a creator marketplace for brands, agencies, and creators
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/80 sm:text-base">
              Every order is fulfilled by a real, verified person or a genuine growth channel —
              never a bot, never a fake account. Growth services, priced per 1,000 units, and
              organic creator packages, priced per package.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm hover:brightness-105"
              >
                Get Started
              </Link>
              <Link
                href="/services"
                className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Browse Services
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
              <StatItem label="Available services" value={stats ? stats.availableServices.toLocaleString() : '…'} />
              <StatItem label="Orders completed" value={stats ? stats.ordersProcessed.toLocaleString() : '…'} />
              <StatItem label="Active users" value={stats ? stats.activeUsers.toLocaleString() : '…'} />
            </div>
            <p className="mt-2 text-[11px] text-white/50">
              Real, live counts from this platform — Hayathmanager is new, so these numbers are
              small today. We&apos;d rather show you the truth than a bigger fake one.
            </p>
          </div>

          <AuthCard />
        </div>
      </section>

      {/* Supported platforms ribbon */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Supported platforms
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {PLATFORMS.map((p) => (
              <div key={p.label} className="flex flex-col items-center gap-1.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground shadow-warm">
                  {p.glyph}
                </span>
                <span className="text-xs text-muted-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-card p-5 shadow-warm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-warm">
                {s.step}
              </span>
              <p className="mt-3 text-sm font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-center text-2xl font-semibold tracking-tight">Why Hayathmanager</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border border-border bg-card p-5 shadow-warm">
              <p className="text-sm font-semibold">{b.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principles (honest stand-in for fabricated "global coverage" / reviews) */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Our one non-negotiable rule</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            No fake engagement, no bot accounts, no automated fake likes, follows, or views —
            ever. Every service on this platform is fulfilled by a real, verified person or a
            genuine growth channel. It&apos;s the reason the numbers above are small: we grew them
            honestly, and we&apos;re not going to show you invented ones to look bigger.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular services</p>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-5">
            {PLATFORM_SERVICE_COLUMNS.map((col) => (
              <div key={col.platform}>
                <p className="text-sm font-semibold">{col.label}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {SERVICE_CATEGORY_LINKS.map((cat) => (
                    <li key={cat.category}>
                      <Link href={`/services?platform=${col.platform}&category=${cat.category}`} className="hover:underline">
                        {col.label} {cat.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-warm">
                  H
                </span>
                Hayathmanager
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Real growth, real people.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <Link href="/blog" className="hover:underline">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:underline">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="hover:underline">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/api-access" className="hover:underline">
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <Link href="/login" className="hover:underline">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:underline">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legal</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <Link href="/terms" className="hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="hover:underline">
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">Hayathmanager © 2026. Real growth services, no bots.</p>
        </div>
      </footer>
    </div>
  );
}
