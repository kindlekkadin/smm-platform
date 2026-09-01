'use client';

import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
        <h2 className="mb-1 text-sm font-semibold">Account</h2>
        <Row label="Display name" value={user.displayName} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role} />
        <Row label="Email verified" value={user.emailVerified ? 'Yes' : 'No'} />
        <Row label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
        <h2 className="mb-1 text-sm font-semibold">Connected accounts</h2>
        <p className="text-sm text-muted-foreground">
          Manage the social accounts linked to your orders.
        </p>
        <Link href="/social-accounts" className="mt-2 inline-block text-sm font-medium underline">
          Manage social accounts →
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Profile editing and password changes aren't available yet — this page currently shows
        your account as it exists today.
      </p>
    </div>
  );
}
