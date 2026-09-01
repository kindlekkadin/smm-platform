'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '../../../../lib/api';
import { EstimateResult, Service, ServiceCategory, estimatePrice, listServices } from '../../../../lib/services-api';
import { SocialAccount, listSocialAccounts } from '../../../../lib/social-accounts-api';
import { Order, createOrder, listOrders } from '../../../../lib/orders-api';
import StatsRow from '../../../../components/StatsRow';

const CATEGORY_ORDER: ServiceCategory[] = [
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

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  FOLLOWERS: 'Social Growth — Followers',
  LIKES: 'Social Growth — Likes',
  VIEWS: 'Social Growth — Views',
  COMMENTS: 'Social Growth — Comments',
  ENGAGEMENT: 'Social Growth — Engagement',
  UGC_CONTENT: 'UGC Content',
  SHOUTOUT: 'Creator Shoutouts',
  AD_CAMPAIGN: 'Sponsored Posts',
  OTHER: 'Other',
};

export default function NewOrderPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[] | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categoryValue, setCategoryValue] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [socialAccountId, setSocialAccountId] = useState('');

  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    listServices()
      .then(({ services }) => setServices(services))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load services.'))
      .finally(() => setLoading(false));

    void listSocialAccounts()
      .then(({ accounts }) => setSocialAccounts(accounts))
      .catch(() => setSocialAccounts([]));

    listOrders()
      .then(({ orders }) => setOrders(orders))
      .catch(() => setOrders([]))
      .finally(() => setStatsLoading(false));
  }, []);

  const categories = useMemo(() => {
    if (!services) return [];
    return CATEGORY_ORDER.filter((c) => services.some((s) => s.category === c));
  }, [services]);

  const categoryServices = useMemo(
    () => (services && categoryValue ? services.filter((s) => s.category === categoryValue) : []),
    [services, categoryValue],
  );

  const selectedService = useMemo(
    () => services?.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const matchingAccounts = useMemo(
    () =>
      selectedService
        ? socialAccounts.filter((a) => a.platform === selectedService.platform && a.status === 'ACTIVE')
        : [],
    [selectedService, socialAccounts],
  );

  function handleCategoryChange(value: string) {
    setCategoryValue(value);
    setServiceId('');
    setEstimate(null);
    setTargetIdentifier('');
  }

  function handleServiceChange(id: string) {
    setServiceId(id);
    setEstimate(null);
    setFormError(null);
    const service = services?.find((s) => s.id === id);
    if (service) {
      setQuantity(service.minQuantity);
      const matches = socialAccounts.filter((a) => a.platform === service.platform && a.status === 'ACTIVE');
      setSocialAccountId(matches[0]?.id ?? '');
    }
  }

  // Dynamic pricing: recompute from the server whenever the selected service
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

  const quantityLabel = selectedService?.pricingModel === 'FLAT' ? 'Quantity (packages)' : 'Quantity';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Order</h1>
        <p className="text-sm text-muted-foreground">Pick a category, choose a service, and place your order.</p>
      </div>

      <StatsRow orders={orders} loading={statsLoading} />

      {loadError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Traditional order form box */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-warm">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading services…</p>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={categoryValue}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  disabled={!categoryValue}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">{categoryValue ? 'Select a service…' : 'Choose a category first'}</option>
                  {categoryServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.pricingModel === 'FLAT' ? `${s.flatPrice}/package` : `${s.pricePerThousand}/1,000`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <>
                  <div className="rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                    <p className="text-sm font-medium text-foreground">{selectedService.name}</p>
                    <p className="mt-1">{selectedService.description}</p>
                    <p className="mt-1">
                      {selectedService.minQuantity.toLocaleString()}–
                      {selectedService.maxQuantity.toLocaleString()}{' '}
                      {selectedService.pricingModel === 'FLAT' ? 'packages' : 'units'} ·{' '}
                      {selectedService.platform}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Link / URL</label>
                    <input
                      type="text"
                      value={targetIdentifier}
                      onChange={(e) => setTargetIdentifier(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                        {selectedService.maxQuantity.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Average Time</label>
                      <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                        {selectedService.estimatedDelivery ?? 'Varies'}
                      </p>
                    </div>
                  </div>

                  {matchingAccounts.length > 0 ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Account</label>
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

                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-2.5">
                    <span className="text-sm font-medium">Total Charge</span>
                    <span className="text-lg font-semibold">
                      {estimating ? '…' : estimate ? estimate.estimatedPrice : '—'}
                    </span>
                  </div>

                  {formError && <p className="text-xs text-red-600">{formError}</p>}

                  <button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || matchingAccounts.length === 0 || quantity <= 0}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Placing order…' : 'Submit Order'}
                  </button>
                </>
              )}
            </>
          )}
        </div>

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
              <Link href="/settings" className="font-medium underline">
                Settings
              </Link>{' '}
              for account support.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
