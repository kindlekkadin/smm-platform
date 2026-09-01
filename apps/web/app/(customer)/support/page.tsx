import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">Guidelines, rules, and where to go for help.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
        <h2 className="mb-2 text-sm font-semibold">Order rules</h2>
        <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
          <li>Every service is fulfilled by a real, verified person — no bots, ever.</li>
          <li>Double-check your link before submitting — orders can&apos;t be edited afterward.</li>
          <li>Orders begin processing once payment is confirmed.</li>
          <li>Make sure your linked account is public, or fulfillment may be delayed.</li>
          <li>Organic packages (UGC videos, shoutouts, sponsored posts) are hand-assigned to a creator, so turnaround can vary — check each service&apos;s Average Time before ordering.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
        <h2 className="mb-1 text-sm font-semibold">Account &amp; connections</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile details or the social accounts linked to your orders.
        </p>
        <div className="mt-2 flex flex-col gap-1 text-sm font-medium">
          <Link href="/settings" className="underline">
            Account settings →
          </Link>
          <Link href="/social-accounts" className="underline">
            Manage social accounts →
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        There's no live chat or ticketing system here yet — this page is the honest current state
        of self-serve support.
      </p>
    </div>
  );
}
