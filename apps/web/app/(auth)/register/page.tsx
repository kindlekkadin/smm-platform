'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError, register } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'CREATOR'>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, displayName, role });
      router.push('/login?registered=1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Create an account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="displayName" className="text-sm font-medium">
              Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-zinc-500">At least 8 characters.</p>
          </div>

          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">I am a</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'CUSTOMER'}
                  onChange={() => setRole('CUSTOMER')}
                />
                Customer
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'CREATOR'}
                  onChange={() => setRole('CREATOR')}
                />
                Creator
              </label>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-center text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
