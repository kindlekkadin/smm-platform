'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { completeConnection } from '../../../../lib/social-accounts-api';

export default function MockConsentPage() {
  return (
    <Suspense fallback={null}>
      <MockConsentForm />
    </Suspense>
  );
}

function MockConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const state = searchParams.get('state');
  const [mockUsername, setMockUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  async function handleAuthorize(e: FormEvent) {
    e.preventDefault();
    if (!state) return;
    setError(null);
    setLoading(true);
    try {
      await completeConnection('DEV_MOCK', {
        state,
        mockUsername: mockUsername.trim() || undefined,
      });
      router.push('/social-accounts');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to complete the connection.');
      setLoading(false);
    }
  }

  if (authLoading || !user) {
    return null;
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-red-600">Missing connection state. Please try again.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This is a simulated consent screen for the <strong>Development Mock Provider</strong>.
          No real social platform is contacted and no real account data is used.
        </div>

        <h1 className="text-xl font-semibold text-center">Authorize connection</h1>

        <form onSubmit={handleAuthorize} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="mockUsername" className="text-sm font-medium">
              Mock account username
            </label>
            <input
              id="mockUsername"
              type="text"
              placeholder="e.g. my_test_account"
              value={mockUsername}
              onChange={(e) => setMockUsername(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-zinc-500">Leave blank to auto-generate one.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded bg-zinc-900 text-white text-sm font-medium py-2 disabled:opacity-50"
            >
              {loading ? 'Authorizing…' : 'Authorize'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/social-accounts')}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
