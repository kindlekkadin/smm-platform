'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import {
  SocialAccount,
  disconnectSocialAccount,
  initiateConnection,
  listSocialAccounts,
} from '../../../lib/social-accounts-api';

export default function SocialAccountsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { accounts } = await listSocialAccounts();
      setAccounts(accounts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load social accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      void load();
    }
  }, [authLoading, user, router, load]);

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const { authorizationUrl } = await initiateConnection('DEV_MOCK');
      router.push(authorizationUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start the connection.');
      setConnecting(false);
    }
  }

  async function handleDisconnect(id: string) {
    setError(null);
    setDisconnectingId(id);
    try {
      await disconnectSocialAccount(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disconnect the account.');
    } finally {
      setDisconnectingId(null);
    }
  }

  if (authLoading || (user && loading && accounts === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const activeAccounts = accounts?.filter((a) => a.status === 'ACTIVE') ?? [];
  const inactiveAccounts = accounts?.filter((a) => a.status !== 'ACTIVE') ?? [];

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Social Accounts</h1>
          <button
            onClick={() => void handleConnect()}
            disabled={connecting}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {connecting ? 'Starting…' : 'Connect account'}
          </button>
        </div>

        <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-3 py-2">
          Real platform integrations (Instagram, TikTok, YouTube, Facebook, X) require OAuth
          developer credentials that are not configured in this environment. Connecting here uses
          a clearly-labeled development mock provider so the connection flow can be tested end to
          end — no real social account or data is involved.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-zinc-500">Loading accounts…</p>}

        {!loading && accounts && accounts.length === 0 && (
          <p className="text-sm text-zinc-500 border border-dashed border-zinc-300 rounded px-3 py-6 text-center">
            No social accounts connected yet.
          </p>
        )}

        {!loading && activeAccounts.length > 0 && (
          <ul className="space-y-2">
            {activeAccounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {account.displayName ?? account.username}{' '}
                    <span className="text-xs font-normal text-zinc-500">
                      · {account.platform}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">@{account.username}</p>
                  <p className="text-xs text-green-700">Active</p>
                </div>
                <button
                  onClick={() => void handleDisconnect(account.id)}
                  disabled={disconnectingId === account.id}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {disconnectingId === account.id ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && inactiveAccounts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Previously connected
            </h2>
            <ul className="space-y-2">
              {inactiveAccounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      {account.displayName ?? account.username}{' '}
                      <span className="text-xs font-normal">· {account.platform}</span>
                    </p>
                    <p className="text-xs text-zinc-400">Disconnected</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
