'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Order, cancelOrder, getOrder } from '../../../../lib/orders-api';
import { initiatePayment } from '../../../../lib/payments-api';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { order } = await getOrder(params.id);
      setOrder(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load order.');
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

  async function handleCancel() {
    setError(null);
    setCancelling(true);
    try {
      const { order } = await cancelOrder(params.id);
      setOrder(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  }

  async function handlePayNow() {
    setError(null);
    setPayingNow(true);
    try {
      const { redirectUrl } = await initiatePayment(params.id);
      router.push(redirectUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start payment.');
      setPayingNow(false);
    }
  }

  if (authLoading || (user && loading)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (error && !order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/orders" className="text-sm underline font-medium">
          Back to orders
        </Link>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <Link href="/orders" className="text-sm underline font-medium">
          ← Back to orders
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{order.service.name}</h1>
          <p className="text-sm text-zinc-500">Order ID: {order.id}</p>
        </div>

        <div className="rounded border border-zinc-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium">{order.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Platform</span>
            <span className="font-medium">{order.service.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Category</span>
            <span className="font-medium">{order.service.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Social account</span>
            <span className="font-medium">
              @{order.socialAccount.username}
              {order.socialAccount.platform === 'DEV_MOCK' ? ' (development mock account)' : ''}
            </span>
          </div>
          {order.targetIdentifier && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Target</span>
              <span className="font-medium">{order.targetIdentifier}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-500">Quantity</span>
            <span className="font-medium">{order.quantity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Unit price / 1,000</span>
            <span className="font-medium">{order.unitPricePerThousand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Total price</span>
            <span className="font-medium">{order.totalPrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Created</span>
            <span className="font-medium">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {order.status === 'PENDING' && (
          <div className="flex gap-2">
            <button
              onClick={() => void handlePayNow()}
              disabled={payingNow}
              className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {payingNow ? 'Starting payment…' : 'Pay now'}
            </button>
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="rounded border border-red-300 text-red-700 text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
