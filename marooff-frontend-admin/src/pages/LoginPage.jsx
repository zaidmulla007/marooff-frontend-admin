import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { token, login } = useAuth();
  const [email, setEmail] = useState('admin@marooff.ae');
  const [password, setPassword] = useState('marooff@123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await login(email.trim(), password);
      nav('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-brand-600">Maroof</div>
          <div className="text-sm text-ink-500">Admin CMS sign-in</div>
        </div>
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-xs text-ink-500 text-center">
            Default: <code className="bg-ink-100 px-1 rounded">admin@marooff.ae</code> /
            <code className="bg-ink-100 px-1 rounded ml-1">marooff@123</code>
          </p>
        </form>
      </div>
    </div>
  );
}
