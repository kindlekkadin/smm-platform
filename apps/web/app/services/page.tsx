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

const PLATFORMS: ServicePlatform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X'];
const CATEGORIES: ServiceCategory[] = ['FOLLOWERS', 'LIKES', 'VIEWS', 'COMMENTS', 'ENGAGEMENT', 'OTHER'];

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
      const { order } = await createOrder({
        serviceId: service.id,
        socialAccountId,
        quantity,
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create order.');
      setOrdering(false);
    }
  }

  return (
    <li className="rounded border border-zinc-200 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">
          {service.name}{' '}
          <span className="text-xs font-normal text-zinc-500">
            · {service.platform} · {service.category}
          </span>
        </p>
        <p className="text-sm text-zinc-600 mt-1">{service.description}</p>
        <p className="text-xs text-zinc-500 mt-2">
          {service.minQuantity.toLocaleString()}–{service.maxQuantity.toLocaleString()} units ·{' '}
          {service.pricePerThousand} per 1,000
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Quantity</label>
          <input
            type="number"
            min={service.minQuantity}
            max={service.maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-32 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>

        {isLoggedIn && matchingAccounts.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Account</label>
            <select
              value={socialAccountId}
              onChange={(e) => setSocialAccountId(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
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
          className="rounded bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
        >
          {estimating ? 'Calculating…' : 'Estimate price'}
        </button>

        {isLoggedIn && matchingAccounts.length > 0 && (
          <button
            onClick={() => void handleCreateOrder()}
            disabled={ordering || !socialAccountId}
            className="rounded border border-zinc-900 text-zinc-900 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {ordering ? 'Placing order…' : 'Create order'}
          </button>
        )}
      </div>

      {!isLoggedIn && (
        <p className="text-xs text-zinc-500">
          <Link href="/login" className="underline font-medium">
            Log in
          </Link>{' '}
          to place an order.
        </p>
      )}
      {isLoggedIn && matchingAccounts.length === 0 && (
        <p className="text-xs text-zinc-500">
          Connect a {service.platform} account to order this service.{' '}
          <Link href="/social-accounts" className="underline font-medium">
            Connect account
          </Link>
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {estimate && (
        <p className="text-sm font-medium text-green-700">
          Estimated price for {estimate.quantity.toLocaleString()} units:{' '}
          {estimate.estimatedPrice}
        </p>
      )}
    </li>
  );
}

export default function ServicesPage() {
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
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Services</h1>

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
            className="flex-1 min-w-[160px] rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ServicePlatform | '')}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
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
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
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
            className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2"
          >
            Filter
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-zinc-500">Loading services…</p>}

        {!loading && services && services.length === 0 && (
          <p className="text-sm text-zinc-500 border border-dashed border-zinc-300 rounded px-3 py-6 text-center">
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
    </main>
  );
}
