import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <p className="text-sm text-muted-foreground">
            Nothing published here yet — no point in a blog full of placeholder posts. Check back
            once there&apos;s something real to write about.
          </p>
        </div>
        <Link href="/" className="text-sm font-medium underline">
          ← Back home
        </Link>
      </main>
    </div>
  );
}
