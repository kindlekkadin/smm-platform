import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Refund Policy</h1>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-warm text-sm text-muted-foreground">
          <p>
            This is the actual, current process — not aspirational policy copy.
          </p>
          <p>
            <span className="font-medium text-foreground">Before you pay:</span> you can cancel
            any order yourself, any time, as long as it&apos;s still unpaid. No money has changed
            hands, so there&apos;s nothing to refund.
          </p>
          <p>
            <span className="font-medium text-foreground">After you pay:</span> orders can&apos;t
            be self-cancelled. If something goes wrong, an admin can mark the payment refunded on
            a case-by-case basis.
          </p>
          <p>
            <span className="font-medium text-foreground">Order payments and your balance are separate.</span>{' '}
            You can add funds to your account balance (see Add Funds), but there&apos;s no way to
            pay for an order from that balance yet — so a refund on an order payment doesn&apos;t
            touch your balance at all. Refund handling outside the unpaid-cancellation path is
            manual today, not an automated system.
          </p>
        </div>
        <Link href="/" className="text-sm font-medium underline">
          ← Back home
        </Link>
      </main>
    </div>
  );
}
