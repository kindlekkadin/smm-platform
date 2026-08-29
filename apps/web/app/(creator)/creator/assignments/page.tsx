'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Service, listServices } from '../../../../lib/services-api';
import { CreatorOffering, OrderAssignment, listMyAssignments, listMyOfferings } from '../../../../lib/creator-api';

const STATUS_STYLES: Record<string, string> = {
  OFFERED: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  ACCEPTED: 'bg-blue-50 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  CANCELLED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

export default function CreatorAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [assignments, setAssignments] = useState<OrderAssignment[] | null>(null);
  const [offeringsById, setOfferingsById] = useState<Record<string, CreatorOffering>>({});
  const [servicesById, setServicesById] = useState<Record<string, Service>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsRes, offeringsRes, servicesRes] = await Promise.all([
        listMyAssignments(),
        listMyOfferings(),
        listServices(),
      ]);
      setAssignments(assignmentsRes.assignments);
      setOfferingsById(Object.fromEntries(offeringsRes.offerings.map((o) => [o.id, o])));
      setServicesById(Object.fromEntries(servicesRes.services.map((s) => [s.id, s])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) void load();
  }, [authLoading, user, router, load]);

  function describeAssignment(a: OrderAssignment): string {
    const offering = offeringsById[a.creatorOfferingId];
    const service = offering ? servicesById[offering.serviceId] : undefined;
    return service ? `${service.name} (${service.platform})` : 'Service details unavailable';
  }

  if (authLoading || !user || (loading && assignments === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Assignment Inbox</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {assignments && assignments.length === 0 && (
          <p className="text-sm text-zinc-500 border border-dashed border-zinc-300 rounded px-3 py-6 text-center">
            No assignments yet. They will appear here once an admin assigns you an order.
          </p>
        )}

        {assignments && assignments.length > 0 && (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/creator/assignments/${a.id}`}
                  className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 hover:border-zinc-400"
                >
                  <div>
                    <p className="text-sm font-medium">{describeAssignment(a)}</p>
                    <p className="text-xs text-zinc-500">
                      {a.creatorPricePerThousand} / 1000 · assigned{' '}
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[a.status] ?? ''}`}
                  >
                    {a.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
