import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="text-sm text-muted-foreground">
            A formal Privacy Policy hasn&apos;t been drafted yet. Plainly: we store the account
            info you give us (email, display name), the social accounts you connect, and your
            order history, in order to run the service — nothing is sold to third parties, and
            real platform connections aren&apos;t wired up in this environment yet.
          </p>
        </div>
        <Link href="/" className="text-sm font-medium underline">
          ← Back home
        </Link>
      </main>
    </div>
  );
}
