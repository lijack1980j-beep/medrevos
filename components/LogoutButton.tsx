'use client';

export function LogoutButton() {
  return <button className="btn" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}>Logout</button>;
}
