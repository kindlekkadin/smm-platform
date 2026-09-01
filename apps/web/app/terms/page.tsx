import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="text-sm text-muted-foreground">
            A formal Terms of Service hasn&apos;t been drafted yet — we&apos;re not going to put
            placeholder legal text here and call it real. What you can rely on today is what&apos;s
            in the product itself: every service is fulfilled by a real person, pricing is shown
            up front before you order, and orders can&apos;t be edited once submitted.
          </p>
        </div>
        <Link href="/" className="text-sm font-medium underline">
          ← Back home
        </Link>
      </main>
    </div>
  );
}
