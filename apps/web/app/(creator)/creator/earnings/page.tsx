'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { CreatorEarning, PayoutRequest, getMyEarnings, listMyPayouts, requestPayout } from '../../../../lib/creator-api';

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-blue-50 text-blue-800 border-blue-200',
  PAID: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

export default function CreatorEarningsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [balance, setBalance] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [earningsRes, payoutsRes] = await Promise.all([getMyEarnings(), listMyPayouts()]);
      setBalance(earningsRes.balance);
      setEarnings(earningsRes.earnings);
      setPayouts(payoutsRes.payoutRequests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load earnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) void load();
  }, [authLoading, user, router, load]);

  async function handleRequestPayout() {
    setError(null);
    setRequesting(true);
    try {
      await requestPayout();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to request payout.');
    } finally {
      setRequesting(false);
    }
  }

  if (authLoading || !user || (loading && balance === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  const hasBalance = balance !== null && Number(balance) > 0;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-2xl font-semibold">Earnings & Payouts</h1>

        <div className="rounded border border-zinc-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Available balance</p>
            <p className="text-2xl font-semibold">{balance ?? '0'}</p>
          </div>
          <button
            onClick={() => void handleRequestPayout()}
            disabled={requesting || !hasBalance}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {requesting ? 'Requesting…' : 'Request payout'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Earnings history</h2>
          {earnings.length === 0 && <p className="text-sm text-zinc-500">No earnings yet.</p>}
          {earnings.length > 0 && (
            <ul className="space-y-1">
              {earnings.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded border border-zinc-100 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-500">{new Date(e.createdAt).toLocaleDateString()}</span>
                  <span className="font-medium">{e.amount}</span>
                  <span className="text-xs text-zinc-400">
                    {e.payoutRequestId ? 'Included in a payout' : 'Available'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Payout requests</h2>
          {payouts.length === 0 && <p className="text-sm text-zinc-500">No payout requests yet.</p>}
          {payouts.length > 0 && (
            <ul className="space-y-1">
              {payouts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded border border-zinc-100 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-500">{new Date(p.requestedAt).toLocaleDateString()}</span>
                  <span className="font-medium">{p.amount}</span>
                  <span
                    className={`text-xs font-medium border rounded px-2 py-1 ${PAYOUT_STATUS_STYLES[p.status] ?? ''}`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
