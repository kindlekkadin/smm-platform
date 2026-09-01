'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Order, listOrders } from '../../../lib/orders-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-50 text-blue-800 border-blue-200',
  PROCESSING: 'bg-blue-50 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  CANCELLED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  FAILED: 'bg-red-50 text-red-800 border-red-200',
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { orders } = await listOrders();
      setOrders(orders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      void load();
    }
  }, [authLoading, user, router, load]);

  if (authLoading || (user && loading && orders === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your Orders</h1>
          <Link href="/orders/new" className="text-sm font-medium underline">
            New order
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-zinc-500">Loading orders…</p>}

        {!loading && orders && orders.length === 0 && (
          <p className="text-sm text-zinc-500 border border-dashed border-zinc-300 rounded px-3 py-6 text-center">
            No orders yet.{' '}
            <Link href="/orders/new" className="underline font-medium">
              Place your first order
            </Link>
            .
          </p>
        )}

        {!loading && orders && orders.length > 0 && (
          <ul className="space-y-2">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 hover:border-zinc-400"
                >
                  <div>
                    <p className="text-sm font-medium">{order.service.name}</p>
                    <p className="text-xs text-zinc-500">
                      @{order.socialAccount.username} ({order.socialAccount.platform}) ·{' '}
                      {order.quantity.toLocaleString()} units · {order.totalPrice}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[order.status] ?? ''}`}
                  >
                    {order.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
