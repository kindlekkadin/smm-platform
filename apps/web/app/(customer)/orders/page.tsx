'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Orders History</h1>
        <Link
          href="/orders/new"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm hover:brightness-105"
        >
          New order
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading orders…</p>}

      {!loading && orders && orders.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No orders yet.{' '}
          <Link href="/orders/new" className="font-medium underline">
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
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-warm hover:border-peach-deep"
              >
                <div>
                  <p className="text-sm font-medium">{order.service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @{order.socialAccount.username} ({order.socialAccount.platform}) ·{' '}
                    {order.quantity.toLocaleString()} · {order.totalPrice}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-lg border px-2 py-1 text-xs font-medium ${STATUS_STYLES[order.status] ?? ''}`}
                >
                  {order.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
