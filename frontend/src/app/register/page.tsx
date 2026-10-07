'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';
import { AuthLayout, PasswordField } from '@/components/layout/AuthForm';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register({ name, email, password });
      setToken(data.token);
      if (data.user) setUser(data.user);
      router.push('/quiz/diagnostic');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      intro={<>After signing up you take a 15-question diagnostic, which sets your starting mastery in each topic. Already registered? <Link href="/login" className="link">Sign in</Link>.</>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div>
          <label htmlFor="reg-name" className="label">Name</label>
          <input id="reg-name" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="reg-email" className="label">Email</label>
          <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field" />
        </div>
        <PasswordField id="reg-password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 6 characters." />
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm t-graphite">
          By creating an account you agree to the <Link href="/terms" className="link">terms</Link> and confirm you
          have read the <Link href="/privacy" className="link">privacy page</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
