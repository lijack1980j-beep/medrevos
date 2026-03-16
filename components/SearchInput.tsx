'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export function SearchInput() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} className="nav-search">
      <input
        ref={inputRef}
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && inputRef.current?.blur()}
        placeholder="Search… (/)"
        className="nav-search-input"
        aria-label="Search"
      />
    </form>
  );
}
