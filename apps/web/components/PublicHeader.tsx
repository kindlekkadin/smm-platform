import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-warm">
            H
          </span>
          <span>Hayathmanager</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/services" className="rounded-lg px-3 py-2 text-foreground hover:bg-muted">
            Services
          </Link>
          <Link href="/api-access" className="rounded-lg px-3 py-2 text-foreground hover:bg-muted">
            API
          </Link>
          <Link href="/login" className="rounded-lg px-3 py-2 text-foreground hover:bg-muted">
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-primary px-4 py-2 text-primary-foreground shadow-warm hover:brightness-105"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}
