'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { CreatorProfile, applyAsCreator, getMyCreatorProfile } from '../../../../lib/creator-api';

export default function CreatorApplyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!user) return;

    setChecking(true);
    getMyCreatorProfile()
      .then(({ profile }) => {
        setProfile(profile);
        setBio(profile.bio ?? '');
      })
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof ApiError ? err.message : 'Failed to check application status.');
        }
      })
      .finally(() => setChecking(false));
  }, [authLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await applyAsCreator({ bio: bio || undefined });
      router.push('/creator/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit application.');
      setSubmitting(false);
    }
  }

  if (authLoading || !user || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  // Already applied and the application is still active (not rejected) — no form to show.
  if (profile && profile.verificationStatus !== 'REJECTED') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-zinc-600">
          You already have a creator application (status: <strong>{profile.verificationStatus}</strong>).
        </p>
        <Link href="/creator/dashboard" className="text-sm underline font-medium">
          Go to your creator dashboard
        </Link>
      </main>
    );
  }

  const isReapplying = profile?.verificationStatus === 'REJECTED';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          {isReapplying ? 'Reapply to become a creator' : 'Become a creator'}
        </h1>

        {isReapplying && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Your previous application was rejected
            {profile?.rejectionReason ? `: "${profile.rejectionReason}"` : '.'} Update your bio below and
            resubmit.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="bio" className="text-sm font-medium">
              Tell us about yourself
            </label>
            <textarea
              id="bio"
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Your experience, niche, audience, etc."
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-zinc-900 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : isReapplying ? 'Resubmit application' : 'Submit application'}
          </button>
        </form>
      </div>
    </main>
  );
}
