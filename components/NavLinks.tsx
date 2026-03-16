'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const coreLinks = [
  ['/', 'Home'],
  ['/dashboard', 'Dashboard'],
  ['/study', 'Study'],
  ['/questions', 'Qbank'],
  ['/flashcards', 'Flashcards'],
  ['/quick', 'Quick'],
  ['/cases', 'Cases'],
  ['/exam', 'Exam'],
  ['/analytics', 'Analytics'],
] as const;

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="nav-links">
      {coreLinks.map(([href, label]) => (
        <Link key={href} href={href} className={`nav-link${isActive(href) ? ' active' : ''}`}>
          {label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" className={`nav-link${isActive('/admin') ? ' active' : ''}`}>
          Admin
        </Link>
      )}
    </div>
  );
}
