import Link from 'next/link';

export default function AddFundsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add Funds</h1>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-warm">
        <p className="text-sm font-medium">Prepaid balance isn't available yet</p>
        <p className="text-sm text-muted-foreground">
          There's no account wallet to top up right now — orders are paid individually, one at a
          time, right after you place them. We're not going to pretend otherwise here.
        </p>
        <p className="text-sm text-muted-foreground">
          Want to order something? Head to New Order and pay for that order directly once it's
          created.
        </p>
        <Link
          href="/orders/new"
          className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm hover:brightness-105"
        >
          Go to New Order
        </Link>
      </div>
    </div>
  );
}
