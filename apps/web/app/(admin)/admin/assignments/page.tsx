'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Order, adminListOrders } from '../../../../lib/orders-api';
import {
  CreatorOffering,
  OrderAssignment,
  adminCancelAssignment,
  adminCreateAssignment,
  adminListAssignmentsForOrder,
  adminListOfferings,
} from '../../../../lib/creator-api';

const ASSIGNMENT_STATUS_STYLES: Record<string, string> = {
  OFFERED: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  ACCEPTED: 'bg-blue-50 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  CANCELLED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const ACTIVE_STATUSES = new Set(['OFFERED', 'ACCEPTED']);

function OrderAssignmentRow({
  order,
  eligibleOfferings,
}: {
  order: Order;
  eligibleOfferings: CreatorOffering[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [assignments, setAssignments] = useState<OrderAssignment[] | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    setError(null);
    try {
      const { assignments } = await adminListAssignmentsForOrder(order.id);
      setAssignments(assignments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignments for this order.');
    } finally {
      setLoadingAssignments(false);
    }
  }, [order.id]);

  async function handleToggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && assignments === null) {
      await loadAssignments();
    }
  }

  async function handleAssign() {
    if (!selectedOfferingId) return;
    setAssigning(true);
    setError(null);
    try {
      await adminCreateAssignment(order.id, selectedOfferingId);
      setSelectedOfferingId('');
      await loadAssignments();
      setExpanded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create assignment.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleCancel(assignmentId: string) {
    setCancellingId(assignmentId);
    setError(null);
    try {
      await adminCancelAssignment(assignmentId, 'Cancelled by admin');
      await loadAssignments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel assignment.');
    } finally {
      setCancellingId(null);
    }
  }

  const hasActiveAssignment = assignments?.some((a) => ACTIVE_STATUSES.has(a.status)) ?? false;

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
          {expanded ? 'Hide assignments' : 'View assignments'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 rounded bg-zinc-50 p-3">
          {loadingAssignments && <p className="text-xs text-zinc-500">Loading…</p>}
          {!loadingAssignments && assignments && assignments.length === 0 && (
            <p className="text-xs text-zinc-500">No assignments yet for this order.</p>
          )}
          {!loadingAssignments && assignments && assignments.length > 0 && (
            <ul className="space-y-1">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs">
                  <span>
                    Creator {a.creatorProfileId.slice(0, 8)}… · {a.creatorPricePerThousand} / 1000
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`font-medium border rounded px-2 py-0.5 ${ASSIGNMENT_STATUS_STYLES[a.status] ?? ''}`}
                    >
                      {a.status}
                    </span>
                    {ACTIVE_STATUSES.has(a.status) && (
                      <button
                        onClick={() => void handleCancel(a.id)}
                        disabled={cancellingId === a.id}
                        className="rounded border border-red-300 text-red-700 px-2 py-0.5 disabled:opacity-50"
                      >
                        {cancellingId === a.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!hasActiveAssignment && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(e.target.value)}
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">Select a creator offering…</option>
                {eligibleOfferings.map((o) => (
                  <option key={o.id} value={o.id}>
                    Creator {o.creatorProfileId.slice(0, 8)}… · {o.creatorPricePerThousand} / 1000 · (
                    {o.minQuantity}-{o.maxQuantity})
                  </option>
                ))}
              </select>
              <button
                onClick={() => void handleAssign()}
                disabled={assigning || !selectedOfferingId}
                className="rounded bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
              >
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          )}
          {eligibleOfferings.length === 0 && (
            <p className="text-xs text-zinc-400">
              No approved, active creator offerings exist for this service yet.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [offerings, setOfferings] = useState<CreatorOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, offeringsRes] = await Promise.all([adminListOrders(), adminListOfferings()]);
      setOrders(ordersRes.orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING'));
      setOfferings(offeringsRes.offerings.filter((o) => o.status === 'APPROVED' && o.active));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders/offerings.');
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
        <h1 className="text-2xl font-semibold">Admin · Order Assignments</h1>
        <p className="text-xs text-zinc-500">
          Showing orders that are CONFIRMED or PROCESSING (eligible for assignment or reassignment).
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && orders && orders.length === 0 && (
          <p className="text-sm text-zinc-500">No orders currently need assignment.</p>
        )}

        {!loading && orders && orders.length > 0 && (
          <ul className="space-y-2">
            {orders.map((order) => (
              <OrderAssignmentRow
                key={order.id}
                order={order}
                eligibleOfferings={offerings.filter((o) => o.serviceId === order.service.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
