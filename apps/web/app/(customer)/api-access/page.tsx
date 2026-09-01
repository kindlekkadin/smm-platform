import Link from 'next/link';

export default function ApiAccessPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">API</h1>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-warm">
        <p className="text-sm font-medium">Programmatic access isn&apos;t available yet</p>
        <p className="text-sm text-muted-foreground">
          There's no API key or public endpoint to place orders outside the app right now — we're
          not going to show you a fake key or made-up docs here.
        </p>
        <p className="text-sm text-muted-foreground">
          For now, every order goes through New Order, the same as everyone else&apos;s.
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
