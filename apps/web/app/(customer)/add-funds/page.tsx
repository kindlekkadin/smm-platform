'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import { WalletTransaction, getWallet, initiateTopUp } from '../../../lib/payments-api';

const QUICK_AMOUNTS = [10, 25, 50, 100];

export default function AddFundsPage() {
  return (
    <Suspense fallback={null}>
      <AddFundsContent />
    </Suspense>
  );
}

function AddFundsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('25');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelled = searchParams.get('status') === 'cancelled';

  const load = async () => {
    setLoading(true);
    try {
      const { balance, transactions } = await getWallet();
      setBalance(balance);
      setTransactions(transactions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your balance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const { redirectUrl } = await initiateTopUp(value);
      router.push(redirectUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start the top-up.');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add Funds</h1>

      <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current balance</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{loading ? '…' : balance}</p>
      </div>

      <p className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        You can add funds to your balance below and it&apos;ll show up here immediately once
        payment succeeds — but there&apos;s nothing to spend it on yet. Orders are still paid
        individually, one at a time, right after you place them. This is honest groundwork for a
        future feature, not a working prepaid-checkout system today.
      </p>

      {cancelled && (
        <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          Top-up cancelled — no funds were added.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-warm">
        <label className="text-xs font-medium text-muted-foreground">Amount</label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {a}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition-all hover:brightness-105 disabled:opacity-50"
        >
          {submitting ? 'Starting…' : 'Add Funds'}
        </button>
      </form>

      {!loading && transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="mb-2 text-sm font-semibold">Recent top-ups</p>
          <ul className="space-y-2 text-sm">
            {transactions.map((t) => (
              <li key={t.id} className="flex justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</span>
                <span className="font-medium text-green-700">+{t.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
