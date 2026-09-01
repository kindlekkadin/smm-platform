'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Order, listOrders } from '../../../lib/orders-api';
import { Service } from '../../../lib/services-api';
import StatsRow from '../../../components/StatsRow';
import OrderForm from '../../../components/OrderForm';

function ActionCard({ href, title, sub, tone = 'default' }: { href: string; title: string; sub?: string; tone?: 'default' | 'primary' | 'accent' }) {
  const toneClasses =
    tone === 'primary'
      ? 'bg-primary text-primary-foreground border-transparent shadow-warm hover:brightness-105'
      : tone === 'accent'
        ? 'bg-secondary text-secondary-foreground border-transparent shadow-warm hover:brightness-105'
        : 'bg-card text-card-foreground border-border hover:border-peach-deep hover:shadow-warm';

  return (
    <Link
      href={href}
      className={`rounded-xl border px-4 py-3.5 text-sm font-medium transition-all ${toneClasses}`}
    >
      <p>{title}</p>
      {sub && <p className="mt-0.5 text-xs font-normal opacity-80">{sub}</p>}
    </Link>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-peach-deep" />
        {label}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ServicePanel({ service }: { service: Service | null }) {
  if (!service) {
    return (
      <>
        <h2 className="text-sm font-semibold">Service Description &amp; Rules</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Pick a category and service on the left to see its details here.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-muted-foreground">
          <li>Every service is fulfilled by a real, verified person — no bots, ever.</li>
          <li>Double-check your link before submitting — orders can&apos;t be edited afterward.</li>
          <li>Orders begin processing once payment is confirmed.</li>
        </ul>
      </>
    );
  }

  return (
    <>
      <h2 className="text-sm font-semibold">{service.name}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform</span>
          <span className="font-medium">{service.platform}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{service.pricingModel === 'FLAT' ? 'Packages' : 'Units'}</span>
          <span className="font-medium">
            {service.minQuantity.toLocaleString()}–{service.maxQuantity.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Price</span>
          <span className="font-medium">
            {service.pricingModel === 'FLAT' ? `${service.flatPrice}/package` : `${service.pricePerThousand}/1,000`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Average Time</span>
          <span className="font-medium">{service.estimatedDelivery ?? 'Varies'}</span>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    listOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) => {
        if (!(err instanceof ApiError)) throw err;
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {user.email} · {user.role}
        </p>
      </div>

      <StatsRow orders={orders} loading={loading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <OrderForm showInlineDetails={false} onServiceChange={setSelectedService} />

        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-warm lg:sticky lg:top-20">
          <ServicePanel service={selectedService} />
        </aside>
      </div>

      <Section label="Your account">
        <ActionCard href="/social-accounts" title="Manage social accounts" sub="Connect and review linked accounts" />
        <ActionCard href="/support" title="Support" sub="Order rules and account help" />
      </Section>

      {user.role === 'CREATOR' && (
        <Section label="Creator">
          <ActionCard href="/creator/dashboard" title="Creator dashboard" sub="Offerings, assignments, and earnings" tone="accent" />
        </Section>
      )}

      {user.role === 'ADMIN' && (
        <Section label="Admin">
          <ActionCard href="/admin/services" title="Manage services" />
          <ActionCard href="/admin/creators" title="Creator applications" />
          <ActionCard href="/admin/creator-offerings" title="Creator offerings" />
          <ActionCard href="/admin/assignments" title="Order assignments" />
          <ActionCard href="/admin/payouts" title="Payout requests" />
          <ActionCard href="/admin/providers" title="Providers" />
          <ActionCard href="/admin/provider-mappings" title="Provider mappings" />
          <ActionCard href="/admin/provider-logs" title="Provider dispatch log" />
          <ActionCard href="/admin/analytics" title="Analytics & financial reporting" />
        </Section>
      )}
    </div>
  );
}
