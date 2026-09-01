'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import Navbar from '../../../components/Navbar';

function ActionCard({ href, title, sub, tone = 'default' }: { href: string; title: string; sub?: string; tone?: 'default' | 'primary' | 'accent' }) {
  const toneClasses =
    tone === 'primary'
      ? 'bg-primary text-primary-foreground border-transparent shadow-warm hover:brightness-105'
      : tone === 'accent'
        ? 'bg-secondary text-secondary-foreground border-transparent shadow-warm hover:brightness-105'
        : 'bg-card text-card-foreground border-border hover:border-peach-deep hover:shadow-warm';

  return (
    <Link
      href={href}
      className={`rounded-xl border px-4 py-3.5 text-sm font-medium transition-all ${toneClasses}`}
    >
      <p>{title}</p>
      {sub && <p className="mt-0.5 text-xs font-normal opacity-80">{sub}</p>}
    </Link>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-peach-deep" />
        {label}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) {
    // Redirect is in flight; render nothing to avoid a flash of protected content.
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} · {user.role}
          </p>
        </div>

        <Section label="Your account">
          <ActionCard href="/social-accounts" title="Manage social accounts" sub="Connect and review linked accounts" tone="primary" />
          <ActionCard href="/services" title="Browse services" sub="See what's available to order" />
          <ActionCard href="/orders" title="Your orders" sub="Track status and history" />
        </Section>

        {user.role === 'CREATOR' && (
          <Section label="Creator">
            <ActionCard href="/creator/dashboard" title="Creator dashboard" sub="Offerings, assignments, and earnings" tone="accent" />
          </Section>
        )}

        {user.role === 'ADMIN' && (
          <Section label="Admin">
            <ActionCard href="/admin/services" title="Manage services" />
            <ActionCard href="/admin/creators" title="Creator applications" />
            <ActionCard href="/admin/creator-offerings" title="Creator offerings" />
            <ActionCard href="/admin/assignments" title="Order assignments" />
            <ActionCard href="/admin/payouts" title="Payout requests" />
            <ActionCard href="/admin/providers" title="Providers" />
            <ActionCard href="/admin/provider-mappings" title="Provider mappings" />
            <ActionCard href="/admin/provider-logs" title="Provider dispatch log" />
            <ActionCard href="/admin/analytics" title="Analytics & financial reporting" />
          </Section>
        )}
      </main>
    </div>
  );
}
