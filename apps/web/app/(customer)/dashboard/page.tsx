'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    // Redirect is in flight; render nothing to avoid a flash of protected content.
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Welcome, {user.displayName}</h1>
      <p className="text-sm text-zinc-600">
        {user.email} · {user.role}
      </p>
      <Link
        href="/social-accounts"
        className="rounded bg-zinc-900 text-white px-4 py-2 text-sm font-medium"
      >
        Manage social accounts
      </Link>
      <Link href="/services" className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium">
        Browse services
      </Link>
      <Link href="/orders" className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium">
        Your orders
      </Link>
      {user.role === 'CREATOR' && (
        <Link
          href="/creator/dashboard"
          className="rounded border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-800"
        >
          Creator dashboard
        </Link>
      )}
      {user.role === 'ADMIN' && (
        <>
          <Link
            href="/admin/services"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: manage services
          </Link>
          <Link
            href="/admin/creators"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: creator applications
          </Link>
          <Link
            href="/admin/creator-offerings"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: creator offerings
          </Link>
          <Link
            href="/admin/assignments"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: order assignments
          </Link>
          <Link
            href="/admin/payouts"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: payout requests
          </Link>
          <Link
            href="/admin/providers"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: providers
          </Link>
          <Link
            href="/admin/provider-mappings"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: provider mappings
          </Link>
          <Link
            href="/admin/provider-logs"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: provider dispatch log
          </Link>
          <Link
            href="/admin/analytics"
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Admin: analytics & financial reporting
          </Link>
        </>
      )}
      <button
        onClick={() => {
          void logout().then(() => router.push('/login'));
        }}
        className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium"
      >
        Log out
      </button>
    </main>
  );
}
