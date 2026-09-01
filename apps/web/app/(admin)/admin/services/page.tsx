'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import {
  PricingModel,
  Service,
  ServiceCategory,
  ServicePlatform,
  adminCreateService,
  adminListServices,
  adminSetServiceActive,
} from '../../../../lib/services-api';

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
const PRICING_MODELS: PricingModel[] = ['PER_THOUSAND', 'FLAT'];

export default function AdminServicesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [services, setServices] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'FOLLOWERS' as ServiceCategory,
    platform: 'INSTAGRAM' as ServicePlatform,
    pricingModel: 'PER_THOUSAND' as PricingModel,
    pricePerThousand: '',
    flatPrice: '',
    minQuantity: '',
    maxQuantity: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { services } = await adminListServices();
      setServices(services);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') {
      void load();
    }
  }, [authLoading, user, router, load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminCreateService({
        name: form.name,
        slug: form.slug,
        description: form.description,
        category: form.category,
        platform: form.platform,
        pricingModel: form.pricingModel,
        pricePerThousand:
          form.pricingModel === 'PER_THOUSAND' ? Number(form.pricePerThousand) : undefined,
        flatPrice: form.pricingModel === 'FLAT' ? Number(form.flatPrice) : undefined,
        minQuantity: Number(form.minQuantity),
        maxQuantity: Number(form.maxQuantity),
      });
      setForm({
        name: '',
        slug: '',
        description: '',
        category: 'FOLLOWERS',
        platform: 'INSTAGRAM',
        pricingModel: 'PER_THOUSAND',
        pricePerThousand: '',
        flatPrice: '',
        minQuantity: '',
        maxQuantity: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create service.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(service: Service) {
    setTogglingId(service.id);
    setError(null);
    try {
      await adminSetServiceActive(service.id, !service.active);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update service.');
    } finally {
      setTogglingId(null);
    }
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && services === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-2xl font-semibold">Admin · Services</h1>

        <form onSubmit={handleCreate} className="space-y-3 rounded border border-zinc-200 p-4">
          <h2 className="text-sm font-medium">Create service</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              required
              placeholder="slug-like-this"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <textarea
            required
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as ServicePlatform })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.pricingModel}
              onChange={(e) => setForm({ ...form, pricingModel: e.target.value as PricingModel })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {PRICING_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m === 'PER_THOUSAND' ? 'Per 1,000 units' : 'Flat price per package'}
                </option>
              ))}
            </select>
            {form.pricingModel === 'PER_THOUSAND' ? (
              <input
                required
                type="number"
                step="0.01"
                placeholder="Price / 1000"
                value={form.pricePerThousand}
                onChange={(e) => setForm({ ...form, pricePerThousand: e.target.value })}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            ) : (
              <input
                required
                type="number"
                step="0.01"
                placeholder="Flat price / package"
                value={form.flatPrice}
                onChange={(e) => setForm({ ...form, flatPrice: e.target.value })}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              type="number"
              placeholder="Min qty"
              value={form.minQuantity}
              onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              required
              type="number"
              placeholder="Max qty"
              value={form.maxQuantity}
              onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create service'}
          </button>
        </form>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">All services</h2>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {!loading && services && services.length === 0 && (
            <p className="text-sm text-zinc-500">No services yet.</p>
          )}
          {!loading && services && (
            <ul className="space-y-2">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {service.name}{' '}
                      <span className="text-xs font-normal text-zinc-500">
                        · {service.platform} · {service.category}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {service.slug} · {service.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleToggle(service)}
                    disabled={togglingId === service.id}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {togglingId === service.id
                      ? 'Updating…'
                      : service.active
                        ? 'Deactivate'
                        : 'Activate'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
