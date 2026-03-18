'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

// Maps section keys from lib/access.ts → nav hrefs
const SECTION_ROUTES: Record<string, string> = {
  study:      '/study',
  qbank:      '/questions',
  flashcards: '/flashcards',
  quick:      '/quick',
  cases:      '/cases',
  exam:       '/exam',
  history:    '/exam/history',
  analytics:  '/analytics',
  calendar:   '/calendar',
};

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
  ['/calendar', 'Calendar'],
] as unknown as readonly (readonly [Route, string])[];

export function NavLinks({ isAdmin, blockedSections = [] }: {
  isAdmin: boolean;
  blockedSections?: string[];
}) {
  const pathname = usePathname();

  function isActive(href: Route) {
    if (href === '/') return pathname === '/';
    if (href === '/exam' && pathname.startsWith('/exam/')) {
      return pathname === '/exam' ||
        pathname.startsWith('/exam/results') ||
        pathname === '/exam/history'
        ? false : true;
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isBlocked(href: string) {
    if (isAdmin) return false;
    const entry = Object.entries(SECTION_ROUTES).find(([, route]) => route === href);
    return entry ? blockedSections.includes(entry[0]) : false;
  }

  const renderLink = ([href, label]: readonly [Route, string]) => {
    if (isBlocked(href)) return null;
    return (
      <Link
        key={href}
        href={href}
        className={`nav-link${isActive(href) ? ' active' : ''}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="nav-links">
      {primaryLinks.map(renderLink)}
      <span className="nav-sep" />
      {examLinks.map(renderLink)}
      <span className="nav-sep" />
      {metaLinks.map(renderLink)}
      {isAdmin && (
        <Link href="/admin" className={`nav-link${pathname.startsWith('/admin') ? ' active' : ''}`}>
          Admin
        </Link>
      )}
    </div>
  );
}
