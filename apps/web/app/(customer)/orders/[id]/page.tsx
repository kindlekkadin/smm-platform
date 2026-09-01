'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '../../../../lib/api';
import { Order, cancelOrder, getOrder } from '../../../../lib/orders-api';
import { initiatePayment } from '../../../../lib/payments-api';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

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
    void load();
  }, [load]);

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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/orders" className="text-sm font-medium underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/orders" className="text-sm font-medium underline">
        ← Back to orders
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{order.service.name}</h1>
        <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm shadow-warm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium">{order.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform</span>
          <span className="font-medium">{order.service.platform}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Category</span>
          <span className="font-medium">{order.service.category}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Social account</span>
          <span className="font-medium">
            @{order.socialAccount.username}
            {order.socialAccount.platform === 'DEV_MOCK' ? ' (development mock account)' : ''}
          </span>
        </div>
        {order.targetIdentifier && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium">{order.targetIdentifier}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Quantity</span>
          <span className="font-medium">{order.quantity.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {order.pricingModel === 'FLAT' ? 'Price per package' : 'Unit price / 1,000'}
          </span>
          <span className="font-medium">
            {order.pricingModel === 'FLAT' ? order.unitFlatPrice : order.unitPricePerThousand}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total price</span>
          <span className="font-medium">{order.totalPrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium">{new Date(order.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {order.status === 'PENDING' && (
        <div className="flex gap-2">
          <button
            onClick={() => void handlePayNow()}
            disabled={payingNow}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm hover:brightness-105 disabled:opacity-50"
          >
            {payingNow ? 'Starting payment…' : 'Pay now'}
          </button>
          <button
            onClick={() => void handleCancel()}
            disabled={cancelling}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
