'use client';

import { useState } from 'react';

export function AuthForm({ mode, nextPath }: { mode: 'login' | 'signup'; nextPath?: string | null }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) { setBusy(false); return setError(data.message || 'Request failed.'); }
    // Hard navigation to fully clear Next.js Router Cache — prevents stale data from previous account
    window.location.href = nextPath || '/dashboard';
  }

  return (
    <form className="panel auth-panel" onSubmit={handleSubmit}>
      <div>
        <div className="kicker">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
        <h1>{mode === 'login' ? 'Sign in' : 'Sign up'}</h1>
        <p className="muted">Use the demo admin after seeding: admin@medrev.local / Admin12345!</p>
      </div>
      {mode === 'signup' ? <label>Name<input name="name" required minLength={2} /></label> : null}
      <label>Email<input type="email" name="email" required /></label>
      <label>Password<input type="password" name="password" required minLength={8} /></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
