'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';
import { ApiError } from '../../../../lib/api';
import { Service, listServices } from '../../../../lib/services-api';
import {
  CreatorOffering,
  createMyOffering,
  listMyOfferings,
  updateMyOffering,
} from '../../../../lib/creator-api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-800 border-green-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

const emptyForm = { serviceId: '', creatorPricePerThousand: '', minQuantity: '', maxQuantity: '', notes: '' };

function EditOfferingForm({
  offering,
  onSaved,
  onCancel,
}: {
  offering: CreatorOffering;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    creatorPricePerThousand: offering.creatorPricePerThousand,
    minQuantity: String(offering.minQuantity),
    maxQuantity: String(offering.maxQuantity),
    notes: offering.notes ?? '',
    active: offering.active,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await updateMyOffering(offering.id, {
        creatorPricePerThousand: Number(form.creatorPricePerThousand),
        minQuantity: Number(form.minQuantity),
        maxQuantity: Number(form.maxQuantity),
        notes: form.notes || undefined,
        active: form.active,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update offering.');
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
      {offering.status === 'REJECTED' && (
        <p className="text-xs text-amber-700">Saving will resubmit this offering for review.</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          step="0.01"
          value={form.creatorPricePerThousand}
          onChange={(e) => setForm({ ...form, creatorPricePerThousand: e.target.value })}
          placeholder="Price / 1000"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          value={form.minQuantity}
          onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
          placeholder="Min qty"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          value={form.maxQuantity}
          onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
          placeholder="Max qty"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Notes"
        className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />
        Active (visible for assignment when approved)
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-zinc-300 text-xs font-medium px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CreatorOfferingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [offerings, setOfferings] = useState<CreatorOffering[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offeringsRes, servicesRes] = await Promise.all([listMyOfferings(), listServices()]);
      setOfferings(offeringsRes.offerings);
      setServices(servicesRes.services);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load offerings.');
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createMyOffering({
        serviceId: form.serviceId,
        creatorPricePerThousand: Number(form.creatorPricePerThousand),
        minQuantity: Number(form.minQuantity),
        maxQuantity: Number(form.maxQuantity),
        notes: form.notes || undefined,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create offering.');
    } finally {
      setSubmitting(false);
    }
  }

  function serviceLabel(serviceId: string): string {
    const service = services.find((s) => s.id === serviceId);
    return service ? `${service.name} (${service.platform})` : `Service ${serviceId.slice(0, 8)}…`;
  }

  if (authLoading || !user || (loading && offerings === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-2xl font-semibold">Your Offerings</h1>

        <form onSubmit={handleCreate} className="space-y-3 rounded border border-zinc-200 p-4">
          <h2 className="text-sm font-medium">Propose a new offering</h2>
          <select
            required
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.platform} · {s.category}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input
              required
              type="number"
              step="0.01"
              placeholder="Your price / 1000"
              value={form.creatorPricePerThousand}
              onChange={(e) => setForm({ ...form, creatorPricePerThousand: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              required
              type="number"
              placeholder="Min qty"
              value={form.minQuantity}
              onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              required
              type="number"
              placeholder="Max qty"
              value={form.maxQuantity}
              onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <textarea
            placeholder="Notes (fulfillment terms, turnaround, etc.)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit offering'}
          </button>
        </form>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">All offerings</h2>
          {offerings && offerings.length === 0 && (
            <p className="text-sm text-zinc-500">No offerings yet.</p>
          )}
          {offerings && offerings.length > 0 && (
            <ul className="space-y-2">
              {offerings.map((offering) => (
                <li key={offering.id} className="rounded border border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{serviceLabel(offering.serviceId)}</p>
                      <p className="text-xs text-zinc-500">
                        {offering.creatorPricePerThousand} / 1000 · {offering.minQuantity}–
                        {offering.maxQuantity} units · {offering.active ? 'Active' : 'Paused'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_STYLES[offering.status] ?? ''}`}
                      >
                        {offering.status}
                      </span>
                      <button
                        onClick={() => setEditingId(editingId === offering.id ? null : offering.id)}
                        className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium"
                      >
                        {editingId === offering.id ? 'Close' : 'Edit'}
                      </button>
                    </div>
                  </div>
                  {editingId === offering.id && (
                    <EditOfferingForm
                      offering={offering}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        void load();
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
