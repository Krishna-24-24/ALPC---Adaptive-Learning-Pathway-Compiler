'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';
import { AuthLayout, PasswordField } from '@/components/layout/AuthForm';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  // Filled in when you arrive from "Sign in instead" on the register page.
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('email');
    if (prefill) setEmail(prefill);
  }, []);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      setToken(data.token);
      if (data.user) setUser(data.user);
      router.push(data.user?.diagnosticCompleted ? '/dashboard' : '/quiz/diagnostic');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      intro={<>No account yet? <Link href="/register" className="link">Create one</Link>.</>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div>
          <label htmlFor="login-email" className="label">Email</label>
          <input id="login-email" type="email" required autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} className="field" />
        </div>
        <PasswordField id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
        <button id="login-submit" type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
