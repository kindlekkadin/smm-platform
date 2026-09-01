'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  // Loading, or a logged-in user is about to be redirected — render nothing
  // to avoid a flash of the welcome screen.
  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Hayathmanager</h1>
      <p className="text-zinc-500">Phase 1: Authentication</p>
      <div className="flex gap-3 text-sm font-medium">
        <Link href="/login" className="rounded bg-zinc-900 text-white px-4 py-2">
          Log in
        </Link>
        <Link href="/register" className="rounded border border-zinc-300 px-4 py-2">
          Register
        </Link>
      </div>
    </main>
  );
}
