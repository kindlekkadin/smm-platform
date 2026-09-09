'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pending-topups"
              className="flex items-center gap-2 text-base font-semibold tracking-tight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-warm">
                H
              </span>
              Hayathmanager
            </Link>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              ← Back to Store
            </Link>
            {user && (
              <button
                onClick={() => {
                  void logout().then(() => router.push('/login'));
                }}
                className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
