'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchInput() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} className="nav-search">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search…"
        className="nav-search-input"
        aria-label="Search"
      />
    </form>
  );
}
