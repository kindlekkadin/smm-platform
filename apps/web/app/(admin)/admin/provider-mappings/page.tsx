'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Service, adminListServices } from '../../../../lib/services-api';
import {
  Provider,
  ProviderServiceMapping,
  adminCreateProviderMapping,
  adminListProviderMappings,
  adminListProviders,
  adminUpdateProviderMapping,
} from '../../../../lib/providers-api';

export default function AdminProviderMappingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mappings, setMappings] = useState<ProviderServiceMapping[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [providerId, setProviderId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [providerServiceId, setProviderServiceId] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providersRes, servicesRes, mappingsRes] = await Promise.all([
        adminListProviders(),
        adminListServices(),
        adminListProviderMappings(),
      ]);
      setProviders(providersRes.providers);
      setServices(servicesRes.services);
      setMappings(mappingsRes.mappings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load provider mappings.');
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

  async function handleCreate() {
    if (!providerId || !serviceId || !providerServiceId.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminCreateProviderMapping({
        providerId,
        serviceId,
        providerServiceId: providerServiceId.trim(),
        minQuantity: minQuantity ? Number(minQuantity) : undefined,
        maxQuantity: maxQuantity ? Number(maxQuantity) : undefined,
      });
      setProviderServiceId('');
      setMinQuantity('');
      setMaxQuantity('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create mapping.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(mapping: ProviderServiceMapping) {
    setActingId(mapping.id);
    setError(null);
    try {
      await adminUpdateProviderMapping(mapping.id, { active: !mapping.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update mapping.');
    } finally {
      setActingId(null);
    }
  }

  function providerName(id: string) {
    return providers.find((p) => p.id === id)?.name ?? id.slice(0, 8) + '…';
  }

  function serviceName(id: string) {
    return services.find((s) => s.id === id)?.name ?? id.slice(0, 8) + '…';
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && mappings === null)) {
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
          <h1 className="text-2xl font-semibold">Admin · Provider Service Mappings</h1>
          <p className="text-xs text-zinc-500">
            Maps an internal service to a provider&apos;s own external service id, with optional quantity limits.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded border border-zinc-200 p-4 space-y-2">
          <p className="text-sm font-medium">Add a mapping</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Select provider…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Select service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Provider's external service id"
              value={providerServiceId}
              onChange={(e) => setProviderServiceId(e.target.value)}
              className="col-span-2 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Min quantity (optional)"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Max quantity (optional)"
              value={maxQuantity}
              onChange={(e) => setMaxQuantity(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={creating || !providerId || !serviceId || !providerServiceId.trim()}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create mapping'}
          </button>
        </div>

        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && mappings && mappings.length === 0 && (
          <p className="text-sm text-zinc-500">No provider mappings configured yet.</p>
        )}

        {!loading && mappings && mappings.length > 0 && (
          <ul className="space-y-3">
            {mappings.map((m) => (
              <li key={m.id} className="rounded border border-zinc-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {serviceName(m.serviceId)} → {providerName(m.providerId)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      External id: {m.providerServiceId}
                      {(m.minQuantity !== null || m.maxQuantity !== null) &&
                        ` · Range: ${m.minQuantity ?? '–'} to ${m.maxQuantity ?? '–'}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium border rounded px-2 py-1 ${
                      m.active ? 'bg-green-50 text-green-800 border-green-200' : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                    }`}
                  >
                    {m.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <button
                  onClick={() => void handleToggleActive(m)}
                  disabled={actingId === m.id}
                  className="rounded border border-zinc-300 text-xs font-medium px-2 py-1 disabled:opacity-50"
                >
                  {actingId === m.id ? 'Updating…' : m.active ? 'Deactivate' : 'Activate'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
