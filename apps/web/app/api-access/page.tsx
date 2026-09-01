'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import Sidebar from '../../components/Sidebar';
import PublicHeader from '../../components/PublicHeader';

function ApiAccessContent() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">API</h1>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-warm">
        <p className="text-sm font-medium">Programmatic access isn&apos;t available yet</p>
        <p className="text-sm text-muted-foreground">
          There's no API key or public endpoint to place orders outside the app right now — we're
          not going to show you a fake key or made-up docs here.
        </p>
        <p className="text-sm text-muted-foreground">
          For now, every order goes through New Order, the same as everyone else&apos;s.
        </p>
        <Link
          href="/orders/new"
          className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm hover:brightness-105"
        >
          Go to New Order
        </Link>
      </div>
    </div>
  );
}

export default function ApiAccessPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background md:flex">
        <Sidebar />
        <main className="flex-1 md:pl-64">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <ApiAccessContent />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ApiAccessContent />
      </main>
    </div>
  );
}
