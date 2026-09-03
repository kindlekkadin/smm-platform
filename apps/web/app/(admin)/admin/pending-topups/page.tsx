'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import {
  ManualTopUpSettings,
  WalletTransaction,
  adminApproveManualTopUp,
  adminGetManualTopUpSettings,
  adminListPendingManualTopUps,
  adminRejectManualTopUp,
  adminUpdateManualTopUpSettings,
} from '../../../../lib/payments-api';

type PendingTopUp = WalletTransaction & { user: { id: string; email: string; displayName: string } };

export default function AdminPendingTopUpsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [pending, setPending] = useState<PendingTopUp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const [settings, setSettings] = useState<ManualTopUpSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    qrPhImageUrl: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    instructions: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ transactions }, { settings }] = await Promise.all([
        adminListPendingManualTopUps(),
        adminGetManualTopUpSettings(),
      ]);
      setPending(transactions);
      setSettings(settings);
      setSettingsForm({
        qrPhImageUrl: settings?.qrPhImageUrl ?? '',
        accountName: settings?.accountName ?? '',
        accountNumber: settings?.accountNumber ?? '',
        bankName: settings?.bankName ?? '',
        instructions: settings?.instructions ?? '',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pending top-ups.');
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

  async function handleApprove(id: string) {
    setActingId(id);
    setError(null);
    try {
      await adminApproveManualTopUp(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve this top-up.');
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    setActingId(id);
    setError(null);
    try {
      await adminRejectManualTopUp(id, reasonById[id]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject this top-up.');
    } finally {
      setActingId(null);
    }
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    try {
      const { settings } = await adminUpdateManualTopUpSettings(settingsForm);
      setSettings(settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save payment details.');
    } finally {
      setSavingSettings(false);
    }
  }

  if (authLoading || (user?.role === 'ADMIN' && loading && pending === null)) {
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
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Pending Top-Ups</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Approving credits the customer&apos;s balance immediately — check the reference number
            against what actually arrived before approving.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSaveSettings} className="space-y-3 rounded border border-zinc-200 p-4">
          <h2 className="text-sm font-medium">Receiving account / QR Ph details</h2>
          <p className="text-xs text-zinc-500">
            Shown to customers on their Add Funds page. Leave blank to keep it unconfigured — no
            placeholder account is ever shown to customers.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Bank / provider name"
              value={settingsForm.bankName}
              onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Account name"
              value={settingsForm.accountName}
              onChange={(e) => setSettingsForm({ ...settingsForm, accountName: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Account number"
              value={settingsForm.accountNumber}
              onChange={(e) => setSettingsForm({ ...settingsForm, accountNumber: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              placeholder="QR Ph image URL"
              value={settingsForm.qrPhImageUrl}
              onChange={(e) => setSettingsForm({ ...settingsForm, qrPhImageUrl: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <textarea
            placeholder="Instructions shown to customers (optional)"
            value={settingsForm.instructions}
            onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={savingSettings}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {savingSettings ? 'Saving…' : 'Save details'}
          </button>
          {settings && (
            <p className="text-xs text-green-700">Currently configured and visible to customers.</p>
          )}
        </form>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Pending requests</h2>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {!loading && pending && pending.length === 0 && (
            <p className="text-sm text-zinc-500">No pending top-ups.</p>
          )}
          {!loading && pending && pending.length > 0 && (
            <ul className="space-y-2">
              {pending.map((p) => (
                <li key={p.id} className="rounded border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {p.amount}{' '}
                        <span className="text-xs font-normal text-zinc-500">
                          · {p.user.displayName} ({p.user.email})
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Ref: {p.referenceNumber} · submitted {new Date(p.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Rejection reason (optional)"
                      value={reasonById[p.id] ?? ''}
                      onChange={(e) => setReasonById({ ...reasonById, [p.id]: e.target.value })}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => void handleApprove(p.id)}
                      disabled={actingId === p.id}
                      className="rounded bg-green-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void handleReject(p.id)}
                      disabled={actingId === p.id}
                      className="rounded bg-red-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
