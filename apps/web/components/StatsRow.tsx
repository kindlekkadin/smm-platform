import Link from 'next/link';
import { Order } from '../lib/orders-api';

const PAID_STATUSES = new Set(['CONFIRMED', 'PROCESSING', 'COMPLETED']);

function Segment({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex-1 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
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
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card shadow-warm sm:flex-row sm:divide-x sm:divide-y-0">
      <Segment
        label="Account Balance"
        value={<span className="text-muted-foreground">Coming soon</span>}
        sub={
          <Link href="/add-funds" className="underline">
            Learn more
          </Link>
        }
      />
      <Segment label="Total Orders" value={loading ? '…' : totalOrders.toLocaleString()} />
      <Segment label="Total Spent" value={loading ? '…' : totalSpent.toFixed(2)} sub="Paid orders only" />
    </div>
  );
}
