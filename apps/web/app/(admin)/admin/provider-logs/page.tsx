'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Order, adminListOrders } from '../../../../lib/orders-api';
import {
  Provider,
  ProviderOrderSubmission,
  ProviderServiceMapping,
  adminCancelSubmission,
  adminDispatchOrderToProvider,
  adminListProviderMappings,
  adminListProviders,
  adminListSubmissionsForOrder,
  adminPollSubmission,
  adminRetrySubmission,
} from '../../../../lib/providers-api';

const SUBMISSION_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  SUBMITTED: 'bg-blue-50 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  FAILED: 'bg-red-50 text-red-800 border-red-200',
  CANCELLED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const ACTIVE_STATUSES = new Set(['PENDING', 'SUBMITTED', 'IN_PROGRESS']);

function OrderDispatchRow({
  order,
  mappingsForService,
  providerName,
}: {
  order: Order;
  mappingsForService: ProviderServiceMapping[];
  providerName: (id: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [submissions, setSubmissions] = useState<ProviderOrderSubmission[] | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedMappingId, setSelectedMappingId] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    setError(null);
    try {
      const { submissions } = await adminListSubmissionsForOrder(order.id);
      setSubmissions(submissions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load submissions for this order.');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [order.id]);

  async function handleToggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && submissions === null) {
      await loadSubmissions();
    }
  }

  async function handleDispatch() {
    if (!selectedMappingId) return;
    setDispatching(true);
    setError(null);
    try {
      await adminDispatchOrderToProvider(order.id, selectedMappingId);
      setSelectedMappingId('');
      await loadSubmissions();
      setExpanded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to dispatch order.');
    } finally {
      setDispatching(false);
    }
  }

  async function handlePoll(id: string) {
    setActingId(id);
    setError(null);
    try {
      await adminPollSubmission(id);
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to poll submission.');
    } finally {
      setActingId(null);
    }
  }

  async function handleRetry(id: string) {
    setActingId(id);
    setError(null);
    try {
      await adminRetrySubmission(id);
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to retry submission.');
    } finally {
      setActingId(null);
    }
  }

  async function handleCancel(id: string) {
    setActingId(id);
    setError(null);
    try {
      await adminCancelSubmission(id, 'Cancelled by admin');
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel submission.');
    } finally {
      setActingId(null);
    }
  }

  const hasActiveSubmission = submissions?.some((s) => ACTIVE_STATUSES.has(s.status)) ?? false;

  return (
    <li className="rounded border border-zinc-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {order.service.name} ({order.service.platform})
          </p>
          <p className="text-xs text-zinc-500">
            Order {order.id.slice(0, 8)}… · {order.quantity.toLocaleString()} units · {order.status}
          </p>
        </div>
        <button
          onClick={() => void handleToggleExpand()}
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium"
        >
          {expanded ? 'Hide dispatch log' : 'View dispatch log'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 rounded bg-zinc-50 p-3">
          {loadingSubmissions && <p className="text-xs text-zinc-500">Loading…</p>}
          {!loadingSubmissions && submissions && submissions.length === 0 && (
            <p className="text-xs text-zinc-500">No provider submissions yet for this order.</p>
          )}
          {!loadingSubmissions && submissions && submissions.length > 0 && (
            <ul className="space-y-1">
              {submissions.map((s) => (
                <li key={s.id} className="space-y-1 text-xs border-b border-zinc-200 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span>
                      {providerName(s.providerId)} · attempt {s.attempts}
                      {s.providerOrderRef && ` · ${s.providerOrderRef}`}
                    </span>
                    <span
                      className={`font-medium border rounded px-2 py-0.5 ${SUBMISSION_STATUS_STYLES[s.status] ?? ''}`}
                    >
                      {s.status}
                    </span>
                  </div>
                  {s.externalStatus && <p className="text-zinc-500">External status: {s.externalStatus}</p>}
                  {s.lastError && <p className="text-red-600">Last error: {s.lastError}</p>}
                  <div className="flex gap-2">
                    {(s.status === 'SUBMITTED' || s.status === 'IN_PROGRESS') && (
                      <>
                        <button
                          onClick={() => void handlePoll(s.id)}
                          disabled={actingId === s.id}
                          className="rounded border border-zinc-300 px-2 py-0.5 disabled:opacity-50"
                        >
                          {actingId === s.id ? 'Working…' : 'Poll status'}
                        </button>
                        <button
                          onClick={() => void handleCancel(s.id)}
                          disabled={actingId === s.id}
                          className="rounded border border-red-300 text-red-700 px-2 py-0.5 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {s.status === 'FAILED' && (
                      <button
                        onClick={() => void handleRetry(s.id)}
                        disabled={actingId === s.id}
                        className="rounded border border-zinc-300 px-2 py-0.5 disabled:opacity-50"
                      >
                        {actingId === s.id ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!hasActiveSubmission && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedMappingId}
                onChange={(e) => setSelectedMappingId(e.target.value)}
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">Select a provider mapping…</option>
                {mappingsForService.map((m) => (
                  <option key={m.id} value={m.id}>
                    {providerName(m.providerId)} · {m.providerServiceId}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void handleDispatch()}
                disabled={dispatching || !selectedMappingId}
                className="rounded bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
              >
                {dispatching ? 'Dispatching…' : 'Dispatch'}
              </button>
            </div>
          )}
          {mappingsForService.length === 0 && (
            <p className="text-xs text-zinc-400">No active provider mappings exist for this service yet.</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

export default function AdminProviderLogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [mappings, setMappings] = useState<ProviderServiceMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, providersRes, mappingsRes] = await Promise.all([
        adminListOrders(),
        adminListProviders(),
        adminListProviderMappings(),
      ]);
      setOrders(ordersRes.orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING'));
      setProviders(providersRes.providers);
      setMappings(mappingsRes.mappings.filter((m) => m.active));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders/providers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') void load();
  }, [authLoading, user, router, load]);

  function providerName(id: string) {
    return providers.find((p) => p.id === id)?.name ?? id.slice(0, 8) + '…';
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && orders === null)) {
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
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Provider Dispatch & Audit Log</h1>
          <p className="text-xs text-zinc-500">
            Showing orders that are CONFIRMED or PROCESSING (eligible for provider dispatch or redispatch). This
            is an independent channel alongside creator assignments — an order is fulfilled by one or the other,
            never both at once.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && orders && orders.length === 0 && (
          <p className="text-sm text-zinc-500">No orders currently eligible for provider dispatch.</p>
        )}

        {!loading && orders && orders.length > 0 && (
          <ul className="space-y-2">
            {orders.map((order) => (
              <OrderDispatchRow
                key={order.id}
                order={order}
                mappingsForService={mappings.filter((m) => m.serviceId === order.service.id)}
                providerName={providerName}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
