import Link from 'next/link';
import { Order } from '../lib/orders-api';

const PAID_STATUSES = new Set(['CONFIRMED', 'PROCESSING', 'COMPLETED']);

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-warm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function StatsRow({ orders, loading }: { orders: Order[] | null; loading: boolean }) {
  const totalOrders = orders?.length ?? 0;
  const totalSpent = orders
    ? orders
        .filter((o) => PAID_STATUSES.has(o.status))
        .reduce((sum, o) => sum + Number(o.totalPrice), 0)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        label="Account Balance"
        value={<span className="text-muted-foreground">Coming soon</span>}
        sub={
          <Link href="/add-funds" className="underline">
            Learn more
          </Link>
        }
      />
      <Card label="Total Orders Placed" value={loading ? '…' : totalOrders.toLocaleString()} />
      <Card label="Total Spent" value={loading ? '…' : totalSpent.toFixed(2)} sub="Paid orders only" />
    </div>
  );
}
