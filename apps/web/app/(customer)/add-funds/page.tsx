'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import {
  ManualTopUpSettings,
  WalletTransaction,
  getManualTopUpSettings,
  getWallet,
  submitManualTopUp,
} from '../../../lib/payments-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

export default function AddFundsPage() {
  const [balance, setBalance] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [settings, setSettings] = useState<ManualTopUpSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ balance, transactions }, { settings }] = await Promise.all([
        getWallet(),
        getManualTopUpSettings(),
      ]);
      setBalance(balance);
      setTransactions(transactions);
      setSettings(settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your balance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isConfigured = !!(settings && (settings.qrPhImageUrl || settings.accountNumber));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitted(false);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!referenceNumber.trim()) {
      setError('Enter the payment reference number from your transfer.');
      return;
    }
    setSubmitting(true);
    try {
      await submitManualTopUp(value, referenceNumber.trim());
      setAmount('');
      setReferenceNumber('');
      setSubmitted(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit your top-up.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add Funds</h1>

      <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current balance</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{loading ? '…' : balance}</p>
      </div>

      <p className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        Top-ups are reviewed manually — send the transfer below, then submit the form with your
        reference number. Your balance updates once an admin confirms the transfer arrived, not
        instantly. There&apos;s also nothing to spend the balance on yet — orders are still paid
        individually, one at a time, right after you place them.
      </p>

      {!loading && !isConfigured && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="text-sm font-medium">Manual top-up isn&apos;t set up yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No receiving account or QR Ph code has been configured — we&apos;re not going to show
            you a placeholder account here. Check back once an admin has added real payment
            details.
          </p>
        </div>
      )}

      {!loading && isConfigured && settings && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="mb-3 text-sm font-semibold">Send your payment here</p>
          {settings.qrPhImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.qrPhImageUrl}
              alt="QR Ph code"
              className="mb-3 h-48 w-48 rounded-lg border border-border object-contain"
            />
          )}
          <div className="space-y-1.5 text-sm">
            {settings.bankName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank / provider</span>
                <span className="font-medium">{settings.bankName}</span>
              </div>
            )}
            {settings.accountName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account name</span>
                <span className="font-medium">{settings.accountName}</span>
              </div>
            )}
            {settings.accountNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account number</span>
                <span className="font-medium">{settings.accountNumber}</span>
              </div>
            )}
          </div>
          {settings.instructions && (
            <p className="mt-3 text-xs text-muted-foreground">{settings.instructions}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-warm">
        <p className="text-sm font-semibold">Submit your top-up</p>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Amount sent</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Payment reference number</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="From your bank / GCash / Maya transfer receipt"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {submitted && (
          <p className="text-xs text-green-700">
            Submitted — it&apos;ll show as Pending below until an admin reviews it.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition-all hover:brightness-105 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Top-Up'}
        </button>
      </form>

      {!loading && transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="mb-2 text-sm font-semibold">Recent top-ups</p>
          <ul className="space-y-2 text-sm">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                  {t.referenceNumber && (
                    <p className="text-xs text-muted-foreground/70">Ref: {t.referenceNumber}</p>
                  )}
                  {t.status === 'REJECTED' && t.rejectionReason && (
                    <p className="text-xs text-red-600">{t.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.amount}</span>
                  <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status] ?? ''}`}>
                    {t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
