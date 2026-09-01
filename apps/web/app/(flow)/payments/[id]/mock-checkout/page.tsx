'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../lib/auth-context';
import { ApiError } from '../../../../../lib/api';
import { Payment, getPayment, simulateWebhook } from '../../../../../lib/payments-api';

export default function MockCheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { payment } = await getPayment(params.id);
      setPayment(payment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payment.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      void load();
    }
  }, [authLoading, user, router, load]);

  async function handleOutcome(outcome: 'SUCCEEDED' | 'FAILED') {
    if (!payment) return;
    setError(null);
    setSubmitting(true);
    try {
      await simulateWebhook(payment.providerRef, outcome);
      router.push(payment.orderId ? `/orders/${payment.orderId}` : '/add-funds');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record payment outcome.');
      setSubmitting(false);
    }
  }

  if (authLoading || !user || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (error && !payment) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!payment) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This is a <strong>development mock payment</strong>. No real payment provider is
          contacted and no real money moves. This exists only to test the order-confirmation
          flow.
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">Mock Checkout</h1>
          <p className="text-2xl font-semibold">{payment.amount}</p>
          <p className="text-xs text-zinc-500">Payment ID: {payment.id}</p>
        </div>

        {payment.status !== 'PENDING' ? (
          <p className="text-sm text-center text-zinc-600">
            This payment has already been processed (status: {payment.status}).
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void handleOutcome('SUCCEEDED')}
              disabled={submitting}
              className="rounded bg-green-700 text-white text-sm font-medium py-2 disabled:opacity-50"
            >
              {submitting ? 'Processing…' : 'Simulate successful payment'}
            </button>
            <button
              onClick={() => void handleOutcome('FAILED')}
              disabled={submitting}
              className="rounded border border-red-300 text-red-700 text-sm font-medium py-2 disabled:opacity-50"
            >
              {submitting ? 'Processing…' : 'Simulate failed payment'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </main>
  );
}
