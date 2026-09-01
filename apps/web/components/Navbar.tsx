'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const initial = user?.displayName?.trim()?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-warm">
            S
          </span>
          <span>SMM Platform</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {initial}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
            <button
              onClick={() => {
                void logout().then(() => router.push('/login'));
              }}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
