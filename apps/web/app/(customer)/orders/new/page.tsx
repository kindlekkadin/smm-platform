'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '../../../../lib/api';
import { Order, listOrders } from '../../../../lib/orders-api';
import StatsRow from '../../../../components/StatsRow';
import OrderForm from '../../../../components/OrderForm';

export default function NewOrderPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) => {
        if (!(err instanceof ApiError)) throw err;
        setOrders([]);
      })
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Order</h1>
        <p className="text-sm text-muted-foreground">Pick a category, choose a service, and place your order.</p>
      </div>

      <StatsRow orders={orders} loading={statsLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <OrderForm />

        {/* Side info panel */}
        <aside className="h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-warm lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">Order Guidelines</h2>
          <ul className="list-disc space-y-2 pl-4 text-xs text-muted-foreground">
            <li>Every service is fulfilled by a real, verified person — no bots, ever.</li>
            <li>Double-check your link before submitting — orders can&apos;t be edited afterward.</li>
            <li>Orders begin processing once payment is confirmed.</li>
            <li>Make sure your linked account is public, or fulfillment may be delayed.</li>
          </ul>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-foreground">Need help?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Visit{' '}
              <Link href="/support" className="font-medium underline">
                Support
              </Link>{' '}
              for account help.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
