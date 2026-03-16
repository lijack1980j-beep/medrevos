'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

const primaryLinks = [
  ['/', 'Home'],
  ['/dashboard', 'Dashboard'],
  ['/study', 'Study'],
  ['/questions', 'Qbank'],
  ['/flashcards', 'Flashcards'],
  ['/quick', 'Quick'],
  ['/cases', 'Cases'],
] as const satisfies readonly (readonly [Route, string])[];

const examLinks = [
  ['/exam', 'Exam'],
  ['/exam/history', 'History'],
] as const satisfies readonly (readonly [Route, string])[];

const metaLinks = [
  ['/analytics', 'Analytics'],
] as const satisfies readonly (readonly [Route, string])[];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  function isActive(href: Route) {
    if (href === '/') return pathname === '/';
    if (href === '/exam' && pathname.startsWith('/exam/')) {
      return pathname === '/exam' ||
        pathname.startsWith('/exam/results') ||
        pathname === '/exam/history'
        ? false
        : true;
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  const renderLink = ([href, label]: readonly [Route, string]) => (
    <Link
      key={href}
      href={href}
      className={`nav-link${isActive(href) ? ' active' : ''}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="nav-links">
      {primaryLinks.map(renderLink)}
      <span className="nav-sep" />
      {examLinks.map(renderLink)}
      <span className="nav-sep" />
      {metaLinks.map(renderLink)}
      {isAdmin && renderLink(['/admin', 'Admin'])}
    </div>
  );
}