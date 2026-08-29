'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Service, adminListServices, ServicePlatform } from '../../../../lib/services-api';
import {
  AnalyticsBreakdowns,
  AnalyticsFilters,
  AnalyticsOrderLineItem,
  AnalyticsOverview,
  adminGetAnalyticsBreakdowns,
  adminGetAnalyticsOrders,
  adminGetAnalyticsOverview,
} from '../../../../lib/analytics-api';

const PLATFORMS: ServicePlatform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X', 'DEV_MOCK'];
const PAGE_SIZE = 10;

const CHANNEL_STYLES: Record<string, string> = {
  CREATOR: 'bg-purple-50 text-purple-800 border-purple-200',
  PROVIDER: 'bg-blue-50 text-blue-800 border-blue-200',
  UNFULFILLED: 'bg-zinc-100 text-zinc-600 border-zinc-300',
};

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-zinc-200 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [platform, setPlatform] = useState('');

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [breakdowns, setBreakdowns] = useState<AnalyticsBreakdowns | null>(null);
  const [orders, setOrders] = useState<AnalyticsOrderLineItem[] | null>(null);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters: AnalyticsFilters = {
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
    serviceId: serviceId || undefined,
    platform: (platform as ServicePlatform) || undefined,
  };
  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsedFilters: AnalyticsFilters = JSON.parse(filterKey);
      const [overviewRes, breakdownsRes, ordersRes, servicesRes] = await Promise.all([
        adminGetAnalyticsOverview(parsedFilters),
        adminGetAnalyticsBreakdowns(parsedFilters),
        adminGetAnalyticsOrders({ ...parsedFilters, page, pageSize: PAGE_SIZE }),
        services.length === 0 ? adminListServices() : Promise.resolve({ services }),
      ]);
      setOverview(overviewRes);
      setBreakdowns(breakdownsRes);
      setOrders(ordersRes.orders);
      setOrdersTotal(ordersRes.total);
      setServices(servicesRes.services);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') void load();
  }, [authLoading, user, router, load]);

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setPage(1);
      setter(e.target.value);
    };
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && overview === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(ordersTotal / PAGE_SIZE));

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Analytics & Financial Reporting</h1>
          <p className="text-xs text-zinc-500">
            Every fulfillment figure below is a channel&apos;s own self-report (a creator marking done, or a
            provider status/webhook) — this platform has no real social API integration to check it against
            actual delivered counts. Nothing here is independently verified growth.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded border border-zinc-200 p-3">
          <input
            type="date"
            value={dateFrom}
            onChange={handleFilterChange(setDateFrom)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={handleFilterChange(setDateTo)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <select
            value={serviceId}
            onChange={handleFilterChange(setServiceId)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={platform}
            onChange={handleFilterChange(setPlatform)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {(dateFrom || dateTo || serviceId || platform) && (
            <button
              onClick={() => {
                setPage(1);
                setDateFrom('');
                setDateTo('');
                setServiceId('');
                setPlatform('');
              }}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {overview && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard label="Orders" value={String(overview.orderCount)} sub={`${overview.fulfilledOrderCount} fulfilled`} />
            <SummaryCard label="Gross revenue" value={overview.grossRevenue} />
            <SummaryCard label="Fulfillment cost" value={overview.fulfillmentCost} />
            <SummaryCard label="Net margin" value={overview.netMargin} />
            <SummaryCard label="Margin %" value={`${overview.marginPercent}%`} />
          </div>
        )}

        {breakdowns && (
          <div className="rounded border border-zinc-200 p-4 space-y-2">
            <p className="text-sm font-medium">Channel distribution</p>
            <ul className="space-y-1">
              {breakdowns.byChannel.length === 0 && <p className="text-xs text-zinc-500">No orders in range.</p>}
              {breakdowns.byChannel.map((g) => (
                <li key={g.key} className="flex items-center justify-between text-xs">
                  <span className={`font-medium border rounded px-2 py-0.5 ${CHANNEL_STYLES[g.key] ?? ''}`}>
                    {g.key}
                  </span>
                  <span className="text-zinc-600">
                    {g.orderCount} orders · revenue {g.revenue} · cost {g.cost} · margin {g.margin} (
                    {g.marginPercent}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded border border-zinc-200 p-4 space-y-2">
          <p className="text-sm font-medium">Per-order financial audit</p>
          {loading && <p className="text-xs text-zinc-500">Loading…</p>}
          {!loading && orders && orders.length === 0 && (
            <p className="text-xs text-zinc-500">No orders match these filters.</p>
          )}
          {!loading && orders && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1 pr-2">Order</th>
                    <th className="py-1 pr-2">Service</th>
                    <th className="py-1 pr-2">Channel</th>
                    <th className="py-1 pr-2">Revenue</th>
                    <th className="py-1 pr-2">Cost</th>
                    <th className="py-1 pr-2">Margin</th>
                    <th className="py-1 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.orderId} className="border-t border-zinc-100">
                      <td className="py-1.5 pr-2">
                        {o.orderId.slice(0, 8)}…
                        <br />
                        <span className="text-zinc-400">{new Date(o.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-1.5 pr-2">
                        {o.serviceName}
                        <br />
                        <span className="text-zinc-400">{o.platform}</span>
                      </td>
                      <td className="py-1.5 pr-2">
                        <span className={`font-medium border rounded px-2 py-0.5 ${CHANNEL_STYLES[o.channel] ?? ''}`}>
                          {o.channel}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2">{o.revenue}</td>
                      <td className="py-1.5 pr-2">{o.cost}</td>
                      <td className="py-1.5 pr-2">{o.margin}</td>
                      <td className="py-1.5 pr-2">
                        {o.fulfillmentStatus === 'REPORTED' ? (
                          <span title="Self-reported by the fulfillment channel — not independently verified.">
                            REPORTED (unverified)
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ordersTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
