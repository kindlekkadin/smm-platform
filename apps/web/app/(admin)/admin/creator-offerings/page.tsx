'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Service, adminListServices } from '../../../../lib/services-api';
import {
  CreatorOffering,
  CreatorOfferingStatus,
  adminListOfferings,
  adminUpdateOfferingStatus,
} from '../../../../lib/creator-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

export default function AdminCreatorOfferingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [offerings, setOfferings] = useState<CreatorOffering[] | null>(null);
  const [servicesById, setServicesById] = useState<Record<string, Service>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offeringsRes, servicesRes] = await Promise.all([adminListOfferings(), adminListServices()]);
      setOfferings(offeringsRes.offerings);
      setServicesById(Object.fromEntries(servicesRes.services.map((s) => [s.id, s])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load creator offerings.');
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

  async function handleStatusChange(id: string, status: CreatorOfferingStatus) {
    setActingId(id);
    setError(null);
    try {
      await adminUpdateOfferingStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update offering status.');
    } finally {
      setActingId(null);
    }
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && offerings === null)) {
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
        <h1 className="text-2xl font-semibold">Admin · Creator Offerings</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && offerings && offerings.length === 0 && (
          <p className="text-sm text-zinc-500">No creator offerings yet.</p>
        )}

        {!loading && offerings && (
          <ul className="space-y-2">
            {offerings.map((o) => {
              const service = servicesById[o.serviceId];
              return (
                <li key={o.id} className="rounded border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {service ? `${service.name} (${service.platform})` : `Service ${o.serviceId.slice(0, 8)}…`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Creator {o.creatorProfileId.slice(0, 8)}… · {o.creatorPricePerThousand} / 1000 ·{' '}
                        {o.minQuantity}–{o.maxQuantity} units
                      </p>
                      {o.notes && <p className="text-xs text-zinc-500">{o.notes}</p>}
                    </div>
                    <span
                      className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[o.status] ?? ''}`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {o.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => void handleStatusChange(o.id, 'APPROVED')}
                          disabled={actingId === o.id}
                          className="rounded bg-green-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void handleStatusChange(o.id, 'REJECTED')}
                          disabled={actingId === o.id}
                          className="rounded bg-red-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {o.status === 'APPROVED' && (
                      <button
                        onClick={() => void handleStatusChange(o.id, 'REJECTED')}
                        disabled={actingId === o.id}
                        className="rounded border border-red-300 text-red-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                      >
                        Revoke approval
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
