'use client';

import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import { LogoutButton } from '@/components/LogoutButton';
import { NavLinks } from '@/components/NavLinks';
import { SearchInput } from '@/components/SearchInput';
import { ThemeToggle } from '@/components/ThemeToggle';

export function MainNav() {
  const { user, loading } = useUser();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">Med<span>Revision</span>OS</Link>
        <NavLinks isAdmin={user?.role === 'ADMIN'} blockedSections={user?.blockedSections ?? []} />
        <SearchInput />
        <div className="row">
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <Link href="/settings" className="muted small-text nav-settings-link">{user.name} · {user.role}</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/auth/sign-in" className="btn">Sign in</Link>
              <Link href="/auth/sign-up" className="btn primary">Create account</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
