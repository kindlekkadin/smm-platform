'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import {
  CreatorProfile,
  CreatorVerificationStatus,
  adminListCreators,
  adminUpdateCreatorStatus,
} from '../../../../lib/creator-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-zinc-100 text-zinc-600 border-zinc-300',
};

export default function AdminCreatorsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<CreatorProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { profiles } = await adminListCreators();
      setProfiles(profiles);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load creator applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') void load();
  }, [authLoading, user, router, load]);

  async function handleStatusChange(id: string, status: CreatorVerificationStatus) {
    setActingId(id);
    setError(null);
    try {
      await adminUpdateCreatorStatus(id, status, reasonById[id]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update creator status.');
    } finally {
      setActingId(null);
    }
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && profiles === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Admin · Creator Applications</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && profiles && profiles.length === 0 && (
          <p className="text-sm text-zinc-500">No creator applications yet.</p>
        )}

        {!loading && profiles && (
          <ul className="space-y-3">
            {profiles.map((p) => (
              <li key={p.id} className="rounded border border-zinc-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">User {p.userId.slice(0, 8)}…</p>
                    <p className="text-xs text-zinc-500">
                      Applied {new Date(p.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[p.verificationStatus] ?? ''}`}
                  >
                    {p.verificationStatus}
                  </span>
                </div>
                {p.bio && <p className="text-sm text-zinc-600">{p.bio}</p>}
                {p.rejectionReason && (
                  <p className="text-xs text-red-600">Last rejection reason: {p.rejectionReason}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {p.verificationStatus === 'PENDING' && (
                    <>
                      <input
                        type="text"
                        placeholder="Reason (for rejection)"
                        value={reasonById[p.id] ?? ''}
                        onChange={(e) => setReasonById({ ...reasonById, [p.id]: e.target.value })}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => void handleStatusChange(p.id, 'APPROVED')}
                        disabled={actingId === p.id}
                        className="rounded bg-green-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void handleStatusChange(p.id, 'REJECTED')}
                        disabled={actingId === p.id}
                        className="rounded bg-red-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {p.verificationStatus === 'APPROVED' && (
                    <button
                      onClick={() => void handleStatusChange(p.id, 'SUSPENDED')}
                      disabled={actingId === p.id}
                      className="rounded border border-red-300 text-red-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  )}
                  {p.verificationStatus === 'SUSPENDED' && (
                    <button
                      onClick={() => void handleStatusChange(p.id, 'APPROVED')}
                      disabled={actingId === p.id}
                      className="rounded bg-green-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      Reinstate
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
