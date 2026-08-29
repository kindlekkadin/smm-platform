'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { CreatorProfile, getMyCreatorProfile } from '../../../../lib/creator-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-zinc-100 text-zinc-600 border-zinc-300',
};

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!user) return;

    setLoading(true);
    getMyCreatorProfile()
      .then(({ profile }) => setProfile(profile))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          router.push('/creator/apply');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Failed to load your creator profile.');
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || !user || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">Creator Dashboard</h1>

        <div className="rounded border border-zinc-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Application status</span>
            <span
              className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[profile.verificationStatus] ?? ''}`}
            >
              {profile.verificationStatus}
            </span>
          </div>
          {profile.bio && <p className="text-sm text-zinc-600">{profile.bio}</p>}
          {profile.verificationStatus === 'PENDING' && (
            <p className="text-xs text-zinc-500">
              Your application is awaiting admin review. You can still set up offerings below in the
              meantime.
            </p>
          )}
          {profile.verificationStatus === 'SUSPENDED' && (
            <p className="text-xs text-red-600">
              Your creator account is suspended and cannot receive new assignments.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Link
            href="/creator/offerings"
            className="rounded border border-zinc-300 px-4 py-3 text-sm font-medium"
          >
            Manage offerings
          </Link>
          <Link
            href="/creator/assignments"
            className="rounded border border-zinc-300 px-4 py-3 text-sm font-medium"
          >
            Assignment inbox
          </Link>
          <Link
            href="/creator/earnings"
            className="rounded border border-zinc-300 px-4 py-3 text-sm font-medium"
          >
            Earnings & payouts
          </Link>
        </div>
      </div>
    </main>
  );
}
