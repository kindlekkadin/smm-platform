'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import {
  EstimateResult,
  Service,
  ServiceCategory,
  ServicePlatform,
  estimatePrice,
  listServices,
} from '../../lib/services-api';
import { SocialAccount, listSocialAccounts } from '../../lib/social-accounts-api';
import { createOrder } from '../../lib/orders-api';
import Sidebar from '../../components/Sidebar';
import PublicHeader from '../../components/PublicHeader';

const PLATFORMS: ServicePlatform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X'];
const CATEGORIES: ServiceCategory[] = [
  'FOLLOWERS',
  'LIKES',
  'VIEWS',
  'COMMENTS',
  'ENGAGEMENT',
  'UGC_CONTENT',
  'SHOUTOUT',
  'AD_CAMPAIGN',
  'OTHER',
];

function ServiceCard({
  service,
  isLoggedIn,
  matchingAccounts,
}: {
  service: Service;
  isLoggedIn: boolean;
  matchingAccounts: SocialAccount[];
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(service.minQuantity);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [socialAccountId, setSocialAccountId] = useState(matchingAccounts[0]?.id ?? '');
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEstimate() {
    setError(null);
    setEstimating(true);
    setEstimate(null);
    try {
      const result = await estimatePrice(service.id, quantity);
      setEstimate(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to estimate price.');
    } finally {
      setEstimating(false);
    }
  }

  async function handleCreateOrder() {
    setError(null);
    setOrdering(true);
    try {
      const { order } = await createOrder({ serviceId: service.id, socialAccountId, quantity });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create order.');
      setOrdering(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-warm">
      <div>
        <p className="text-sm font-semibold">
          {service.name}{' '}
          <span className="text-xs font-normal text-muted-foreground">
            · {service.platform} · {service.category}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {service.minQuantity.toLocaleString()}–{service.maxQuantity.toLocaleString()}{' '}
          {service.pricingModel === 'FLAT' ? 'packages' : 'units'} ·{' '}
          {service.pricingModel === 'FLAT'
            ? `${service.flatPrice} per package`
            : `${service.pricePerThousand} per 1,000`}
          {service.estimatedDelivery ? ` · ~${service.estimatedDelivery}` : ''}
        </p>
      </div>

      {isLoggedIn && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Quantity</label>
            <input
              type="number"
              min={service.minQuantity}
              max={service.maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>

          {matchingAccounts.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Account</label>
              <select
                value={socialAccountId}
                onChange={(e) => setSocialAccountId(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                {matchingAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    @{account.username}
                    {account.platform === 'DEV_MOCK' ? ' (dev mock)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => void handleEstimate()}
            disabled={estimating}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {estimating ? 'Calculating…' : 'Estimate price'}
          </button>

          {matchingAccounts.length > 0 && (
            <button
              onClick={() => void handleCreateOrder()}
              disabled={ordering || !socialAccountId}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-warm hover:brightness-105 disabled:opacity-50"
            >
              {ordering ? 'Placing order…' : 'Order now'}
            </button>
          )}
        </div>
      )}

      {!isLoggedIn && (
        <p className="mt-2 text-xs text-muted-foreground">
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>{' '}
          to order this service.
        </p>
      )}
      {isLoggedIn && matchingAccounts.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Connect a {service.platform} account to order this.{' '}
          <Link href="/social-accounts" className="font-medium underline">
            Connect account
          </Link>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {estimate && (
        <p className="mt-2 text-sm font-medium text-green-700">
          Estimated price for {estimate.quantity.toLocaleString()}: {estimate.estimatedPrice}
        </p>
      )}
    </li>
  );
}

function ServicesContent() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[] | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<ServicePlatform | ''>('');
  const [category, setCategory] = useState<ServiceCategory | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { services } = await listServices({
        search: search || undefined,
        platform: platform || undefined,
        category: category || undefined,
      });
      setServices(services);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load services.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, platform, category]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      setSocialAccounts([]);
      return;
    }
    void listSocialAccounts()
      .then(({ accounts }) => setSocialAccounts(accounts))
      .catch(() => setSocialAccounts([]));
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">Browse everything available to order.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          type="text"
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as ServicePlatform | '')}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ServiceCategory | '')}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm hover:brightness-105"
        >
          Filter
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading services…</p>}

      {!loading && services && services.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No services match your filters.
        </p>
      )}

      {!loading && services && services.length > 0 && (
        <ul className="space-y-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isLoggedIn={!!user}
              matchingAccounts={socialAccounts.filter(
                (a) => a.platform === service.platform && a.status === 'ACTIVE',
              )}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background md:flex">
        <Sidebar />
        <main className="flex-1 md:pl-64">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <ServicesContent />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ServicesContent />
      </main>
    </div>
  );
}
