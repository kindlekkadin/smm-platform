'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import {
  EstimateResult,
  ORGANIC_CATEGORIES,
  Service,
  ServiceCategory,
  ServicePlatform,
  estimatePrice,
  listServices,
} from '../../../../lib/services-api';
import { SocialAccount, listSocialAccounts } from '../../../../lib/social-accounts-api';
import { createOrder } from '../../../../lib/orders-api';
import Navbar from '../../../../components/Navbar';

const PLATFORMS: ServicePlatform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X'];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  FOLLOWERS: 'Followers',
  LIKES: 'Likes',
  VIEWS: 'Views',
  COMMENTS: 'Comments',
  ENGAGEMENT: 'Engagement',
  UGC_CONTENT: 'UGC videos',
  SHOUTOUT: 'Creator shoutouts',
  AD_CAMPAIGN: 'Sponsored posts',
  OTHER: 'Other',
};

type Group = 'ALL' | 'GROWTH' | 'ORGANIC';

function isOrganic(category: ServiceCategory) {
  return (ORGANIC_CATEGORIES as ServiceCategory[]).includes(category);
}

export default function NewOrderPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [services, setServices] = useState<Service[] | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [group, setGroup] = useState<Group>('ALL');
  const [platform, setPlatform] = useState<ServicePlatform | ''>('');
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [socialAccountId, setSocialAccountId] = useState('');

  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { services } = await listServices({
        platform: platform || undefined,
        search: search || undefined,
      });
      setServices(services);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load services.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, search]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      void load();
    }
  }, [authLoading, user, router, load]);

  useEffect(() => {
    if (!user) return;
    void listSocialAccounts()
      .then(({ accounts }) => setSocialAccounts(accounts))
      .catch(() => setSocialAccounts([]));
  }, [user]);

  const visibleServices = useMemo(() => {
    if (!services) return [];
    if (group === 'ALL') return services;
    if (group === 'ORGANIC') return services.filter((s) => isOrganic(s.category));
    return services.filter((s) => !isOrganic(s.category));
  }, [services, group]);

  const selectedService = useMemo(
    () => services?.find((s) => s.id === selectedId) ?? null,
    [services, selectedId],
  );

  const matchingAccounts = useMemo(
    () =>
      selectedService
        ? socialAccounts.filter((a) => a.platform === selectedService.platform && a.status === 'ACTIVE')
        : [],
    [selectedService, socialAccounts],
  );

  function selectService(service: Service) {
    setSelectedId(service.id);
    setQuantity(service.minQuantity);
    setTargetIdentifier('');
    setEstimate(null);
    setFormError(null);
    const matches = socialAccounts.filter((a) => a.platform === service.platform && a.status === 'ACTIVE');
    setSocialAccountId(matches[0]?.id ?? '');
  }

  // Dynamic pricing: recompute from the server whenever the selected package
  // or quantity changes, debounced so we're not firing on every keystroke.
  useEffect(() => {
    if (!selectedService || quantity <= 0) {
      setEstimate(null);
      return;
    }
    setEstimating(true);
    const timer = setTimeout(() => {
      estimatePrice(selectedService.id, quantity)
        .then(setEstimate)
        .catch(() => setEstimate(null))
        .finally(() => setEstimating(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedService, quantity]);

  async function handleSubmit() {
    if (!selectedService) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const { order } = await createOrder({
        serviceId: selectedService.id,
        socialAccountId,
        quantity,
        targetIdentifier: targetIdentifier || undefined,
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create order.');
      setSubmitting(false);
    }
  }

  if (authLoading || (user && loading && services === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const quantityLabel = selectedService?.pricingModel === 'FLAT' ? 'Packages' : 'Quantity';
  const unitPriceLabel =
    selectedService?.pricingModel === 'FLAT' ? 'Price per package' : 'Price per 1,000';
  const unitPriceValue =
    selectedService?.pricingModel === 'FLAT' ? selectedService.flatPrice : selectedService?.pricePerThousand;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">New Order</h1>
            <p className="text-sm text-muted-foreground">
              Pick a growth service or an organic promotional package, then confirm quantity and pricing.
            </p>
          </div>
          <Link
            href="/orders"
            className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Your orders
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['ALL', 'All'],
              ['GROWTH', 'Growth services'],
              ['ORGANIC', 'Organic packages'],
            ] as [Group, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setGroup(value)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                group === value
                  ? 'bg-primary text-primary-foreground shadow-warm'
                  : 'border border-border bg-card text-card-foreground hover:border-peach-deep'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-card-foreground placeholder:text-muted-foreground"
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ServicePlatform | '')}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-card-foreground"
            >
              <option value="">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              onClick={() => void load()}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground hover:border-peach-deep"
            >
              Filter
            </button>
          </div>
        </div>

        {loadError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading services…</p>}

            {!loading && visibleServices.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No services match your filters.
              </p>
            )}

            {!loading &&
              visibleServices.map((service) => {
                const selected = service.id === selectedId;
                const organic = isOrganic(service.category);
                return (
                  <button
                    key={service.id}
                    onClick={() => selectService(service)}
                    className={`w-full rounded-xl border px-4 py-3.5 text-left transition-all ${
                      selected
                        ? 'border-transparent bg-primary text-primary-foreground shadow-warm'
                        : 'border-border bg-card text-card-foreground hover:border-peach-deep hover:shadow-warm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{service.name}</p>
                      {organic && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            selected
                              ? 'bg-primary-foreground/15 text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          Human-fulfilled
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-xs ${selected ? 'opacity-90' : 'text-muted-foreground'}`}>
                      {service.platform} · {CATEGORY_LABELS[service.category]}
                    </p>
                    <p className={`mt-1.5 text-xs ${selected ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {service.description}
                    </p>
                    <p className={`mt-2 text-xs font-medium ${selected ? '' : 'text-foreground'}`}>
                      {service.pricingModel === 'FLAT'
                        ? `${service.flatPrice} per package`
                        : `${service.pricePerThousand} per 1,000`}
                      {' · '}
                      {service.minQuantity.toLocaleString()}–{service.maxQuantity.toLocaleString()}{' '}
                      {service.pricingModel === 'FLAT' ? 'packages' : 'units'}
                    </p>
                  </button>
                );
              })}
          </div>

          <aside className="h-fit space-y-4 rounded-xl border border-border bg-card p-4 shadow-warm lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold">Order summary</h2>

            {!selectedService && (
              <p className="text-sm text-muted-foreground">Select a service to configure your order.</p>
            )}

            {selectedService && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">{selectedService.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedService.platform} · {CATEGORY_LABELS[selectedService.category]}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{quantityLabel}</label>
                  <input
                    type="number"
                    min={selectedService.minQuantity}
                    max={selectedService.maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {selectedService.minQuantity.toLocaleString()}–
                    {selectedService.maxQuantity.toLocaleString()} {quantityLabel.toLowerCase()}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Target (post URL / profile — optional)
                  </label>
                  <input
                    type="text"
                    value={targetIdentifier}
                    onChange={(e) => setTargetIdentifier(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {matchingAccounts.length > 0 ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Social account</label>
                    <select
                      value={socialAccountId}
                      onChange={(e) => setSocialAccountId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      {matchingAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          @{account.username}
                          {account.platform === 'DEV_MOCK' ? ' (dev mock)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Connect a {selectedService.platform} account to order this.{' '}
                    <Link href="/social-accounts" className="font-medium underline">
                      Connect account
                    </Link>
                  </p>
                )}

                <div className="space-y-1 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{unitPriceLabel}</span>
                    <span>{unitPriceValue}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>
                      {estimating ? '…' : estimate ? estimate.estimatedPrice : '—'}
                    </span>
                  </div>
                </div>

                {formError && <p className="text-xs text-red-600">{formError}</p>}

                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting || matchingAccounts.length === 0 || quantity <= 0}
                  className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Placing order…' : 'Place order'}
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
