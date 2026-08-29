'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { PayoutRequest, PayoutRequestStatus, adminListPayouts, adminUpdatePayoutStatus } from '../../../../lib/creator-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-blue-50 text-blue-800 border-blue-200',
  PAID: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [payouts, setPayouts] = useState<PayoutRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { payoutRequests } = await adminListPayouts();
      setPayouts(payoutRequests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payout requests.');
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

  async function handleStatusChange(id: string, status: PayoutRequestStatus) {
    setActingId(id);
    setError(null);
    try {
      await adminUpdatePayoutStatus(id, status, notesById[id]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update payout request.');
    } finally {
      setActingId(null);
    }
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && payouts === null)) {
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
        <h1 className="text-2xl font-semibold">Admin · Payout Requests</h1>
        <p className="text-xs text-zinc-500">
          &quot;Paid&quot; only records that you manually sent the money outside this system — no real
          transfer happens here.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && payouts && payouts.length === 0 && (
          <p className="text-sm text-zinc-500">No payout requests yet.</p>
        )}

        {!loading && payouts && payouts.length > 0 && (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={p.id} className="rounded border border-zinc-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.amount}</p>
                    <p className="text-xs text-zinc-500">
                      Creator {p.creatorProfileId.slice(0, 8)}… · requested{' '}
                      {new Date(p.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[p.status] ?? ''}`}
                  >
                    {p.status}
                  </span>
                </div>
                {p.rejectionReason && (
                  <p className="text-xs text-red-600">Rejection reason: {p.rejectionReason}</p>
                )}

                {p.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Notes / rejection reason"
                      value={notesById[p.id] ?? ''}
                      onChange={(e) => setNotesById({ ...notesById, [p.id]: e.target.value })}
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
                  </div>
                )}
                {p.status === 'APPROVED' && (
                  <button
                    onClick={() => void handleStatusChange(p.id, 'PAID')}
                    disabled={actingId === p.id}
                    className="rounded bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                  >
                    Mark as paid
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
