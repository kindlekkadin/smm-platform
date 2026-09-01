'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import {
  SocialAccount,
  disconnectSocialAccount,
  initiateConnection,
  listSocialAccounts,
} from '../../../lib/social-accounts-api';

export default function SocialAccountsPage() {
  const router = useRouter();

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
    void load();
  }, [load]);

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

  const activeAccounts = accounts?.filter((a) => a.status === 'ACTIVE') ?? [];
  const inactiveAccounts = accounts?.filter((a) => a.status !== 'ACTIVE') ?? [];

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Social Accounts</h1>
        <button
          onClick={() => void handleConnect()}
          disabled={connecting}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm hover:brightness-105 disabled:opacity-50"
        >
          {connecting ? 'Starting…' : 'Connect account'}
        </button>
      </div>

      <p className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        Real platform integrations (Instagram, TikTok, YouTube, Facebook, X) require OAuth
        developer credentials that are not configured in this environment. Connecting here uses
        a clearly-labeled development mock provider so the connection flow can be tested end to
        end — no real social account or data is involved.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading accounts…</p>}

      {!loading && accounts && accounts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No social accounts connected yet.
        </p>
      )}

      {!loading && activeAccounts.length > 0 && (
        <ul className="space-y-2">
          {activeAccounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-warm"
            >
              <div>
                <p className="text-sm font-medium">
                  {account.displayName ?? account.username}{' '}
                  <span className="text-xs font-normal text-muted-foreground">· {account.platform}</span>
                </p>
                <p className="text-xs text-muted-foreground">@{account.username}</p>
                <p className="text-xs text-green-700">Active</p>
              </div>
              <button
                onClick={() => void handleDisconnect(account.id)}
                disabled={disconnectingId === account.id}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {disconnectingId === account.id ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && inactiveAccounts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Previously connected
          </h2>
          <ul className="space-y-2">
            {inactiveAccounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {account.displayName ?? account.username}{' '}
                    <span className="text-xs font-normal">· {account.platform}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70">Disconnected</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
