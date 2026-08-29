'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Provider, adminCreateProvider, adminListProviders, adminUpdateProvider } from '../../../../lib/providers-api';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-800 border-green-200',
  INACTIVE: 'bg-zinc-100 text-zinc-600 border-zinc-300',
  ERROR: 'bg-red-50 text-red-800 border-red-200',
};

export default function AdminProvidersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { providers } = await adminListProviders();
      setProviders(providers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load providers.');
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
    if (!name.trim() || !code.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminCreateProvider({
        name: name.trim(),
        code: code.trim(),
        apiEndpoint: apiEndpoint.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      });
      setName('');
      setCode('');
      setApiEndpoint('');
      setApiKey('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create provider.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(provider: Provider) {
    setActingId(provider.id);
    setError(null);
    try {
      await adminUpdateProvider(provider.id, { isActive: !provider.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update provider.');
    } finally {
      setActingId(null);
    }
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && providers === null)) {
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
          <h1 className="text-2xl font-semibold">Admin · Providers</h1>
          <p className="text-xs text-zinc-500">
            Automated fulfillment providers — a second, independent channel alongside human creators. Only
            DEV_MOCK exists in this environment; see PROVIDER_INTEGRATION.md.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded border border-zinc-200 p-4 space-y-2">
          <p className="text-sm font-medium">Add a provider</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="Code (e.g. DEV_MOCK)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="API endpoint (optional)"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="password"
              placeholder="API key (optional, encrypted at rest)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim() || !code.trim()}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create provider'}
          </button>
        </div>

        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!loading && providers && providers.length === 0 && (
          <p className="text-sm text-zinc-500">No providers configured yet.</p>
        )}

        {!loading && providers && providers.length > 0 && (
          <ul className="space-y-3">
            {providers.map((p) => (
              <li key={p.id} className="rounded border border-zinc-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {p.name} <span className="text-zinc-400 font-normal">({p.code})</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {p.apiEndpoint ?? 'No API endpoint configured'} · {p.hasApiKey ? 'API key set' : 'No API key'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[p.status] ?? ''}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${p.isActive ? 'text-green-700' : 'text-zinc-500'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => void handleToggleActive(p)}
                    disabled={actingId === p.id}
                    className="rounded border border-zinc-300 text-xs font-medium px-2 py-1 disabled:opacity-50"
                  >
                    {actingId === p.id ? 'Updating…' : p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
