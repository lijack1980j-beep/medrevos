'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface SessionUser {
  id: string;
  name: string;
  role: string;
  blockedSections: string[];
}

interface UserCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => void;
}

const Ctx = createContext<UserCtx>({ user: null, loading: true, refresh: () => {} });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refresh = useCallback(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch on every route change to keep identity in sync
  useEffect(() => { refresh(); }, [pathname, refresh]);

  return <Ctx.Provider value={{ user, loading, refresh }}>{children}</Ctx.Provider>;
}

export function useUser() {
  return useContext(Ctx);
}
