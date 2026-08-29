import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Real-Growth SMM Platform</h1>
      <p className="text-zinc-500">Phase 1: Authentication</p>
      <div className="flex gap-3 text-sm font-medium">
        <Link href="/login" className="rounded bg-zinc-900 text-white px-4 py-2">
          Log in
        </Link>
        <Link href="/register" className="rounded border border-zinc-300 px-4 py-2">
          Register
        </Link>
      </div>
    </main>
  );
}
