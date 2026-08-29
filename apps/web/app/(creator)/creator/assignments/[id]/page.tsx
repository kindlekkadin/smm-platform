'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../../lib/auth-context';
import { ApiError } from '../../../../../lib/api';
import { Service, getService } from '../../../../../lib/services-api';
import {
  CreatorOffering,
  OrderAssignment,
  acceptAssignment,
  completeAssignment,
  getMyAssignment,
  getMyOffering,
  rejectAssignment,
} from '../../../../../lib/creator-api';

export default function CreatorAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [assignment, setAssignment] = useState<OrderAssignment | null>(null);
  const [offering, setOffering] = useState<CreatorOffering | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { assignment } = await getMyAssignment(params.id);
      setAssignment(assignment);
      const { offering } = await getMyOffering(assignment.creatorOfferingId);
      setOffering(offering);
      try {
        const { service } = await getService(offering.serviceId);
        setService(service);
      } catch {
        // Underlying service may be inactive/unavailable — non-fatal for this view.
        setService(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignment.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) void load();
  }, [authLoading, user, router, load]);

  async function handleAccept() {
    setActionError(null);
    setActing(true);
    try {
      const { assignment } = await acceptAssignment(params.id);
      setAssignment(assignment);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to accept assignment.');
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    setActionError(null);
    setActing(true);
    try {
      const { assignment } = await rejectAssignment(params.id, rejectReason || undefined);
      setAssignment(assignment);
      setShowRejectForm(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to reject assignment.');
    } finally {
      setActing(false);
    }
  }

  async function handleComplete() {
    setActionError(null);
    setActing(true);
    try {
      const { assignment } = await completeAssignment(params.id);
      setAssignment(assignment);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to mark assignment complete.');
    } finally {
      setActing(false);
    }
  }

  if (authLoading || !user || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (error || !assignment) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-red-600">{error ?? 'Assignment not found.'}</p>
        <Link href="/creator/assignments" className="text-sm underline font-medium">
          Back to assignments
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <Link href="/creator/assignments" className="text-sm underline font-medium">
          ← Back to assignments
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {service ? `${service.name} (${service.platform})` : 'Assignment'}
          </h1>
          <p className="text-sm text-zinc-500">Assignment ID: {assignment.id}</p>
        </div>

        <div className="rounded border border-zinc-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium">{assignment.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Your rate / 1,000</span>
            <span className="font-medium">{assignment.creatorPricePerThousand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Assigned</span>
            <span className="font-medium">{new Date(assignment.assignedAt).toLocaleString()}</span>
          </div>
          {assignment.respondedAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Responded</span>
              <span className="font-medium">{new Date(assignment.respondedAt).toLocaleString()}</span>
            </div>
          )}
          {assignment.completedAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Completed</span>
              <span className="font-medium">{new Date(assignment.completedAt).toLocaleString()}</span>
            </div>
          )}
          {assignment.rejectionReason && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Rejection reason</span>
              <span className="font-medium">{assignment.rejectionReason}</span>
            </div>
          )}
          {assignment.cancellationReason && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Cancellation reason</span>
              <span className="font-medium">{assignment.cancellationReason}</span>
            </div>
          )}
        </div>

        {assignment.status === 'OFFERED' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => void handleAccept()}
                disabled={acting}
                className="rounded bg-zinc-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                {acting ? 'Working…' : 'Accept'}
              </button>
              <button
                onClick={() => setShowRejectForm((v) => !v)}
                className="rounded border border-red-300 text-red-700 text-sm font-medium px-4 py-2"
              >
                Reject
              </button>
            </div>
            {showRejectForm && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void handleReject()}
                  disabled={acting}
                  className="rounded bg-red-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                >
                  Confirm reject
                </button>
              </div>
            )}
          </div>
        )}

        {assignment.status === 'ACCEPTED' && (
          <button
            onClick={() => void handleComplete()}
            disabled={acting}
            className="rounded bg-green-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {acting ? 'Working…' : 'Mark complete'}
          </button>
        )}

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      </div>
    </main>
  );
}
