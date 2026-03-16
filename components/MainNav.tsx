import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { NavLinks } from '@/components/NavLinks';
import { SearchInput } from '@/components/SearchInput';

export async function MainNav() {
  const user = await getCurrentUser();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">Med<span>Revision</span>OS</Link>
        <NavLinks isAdmin={user?.role === 'ADMIN'} />
        <SearchInput />
        <div className="row">
          {user ? (
            <>
              <span className="muted small-text">{user.name} · {user.role}</span>
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
