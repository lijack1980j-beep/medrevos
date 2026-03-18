import { redirect } from 'next/navigation';

export const SECTIONS = [
  { key: 'study',      label: 'Lessons',    icon: '📖', route: '/study' },
  { key: 'qbank',      label: 'Q-Bank',     icon: '📝', route: '/questions' },
  { key: 'flashcards', label: 'Flashcards', icon: '🃏', route: '/flashcards' },
  { key: 'quick',      label: 'Quick',      icon: '⚡', route: '/quick' },
  { key: 'cases',      label: 'Cases',      icon: '🩺', route: '/cases' },
  { key: 'exam',       label: 'Exam',       icon: '🎯', route: '/exam' },
  { key: 'history',    label: 'History',    icon: '📜', route: '/exam/history' },
  { key: 'analytics',  label: 'Analytics',  icon: '📊', route: '/analytics' },
  { key: 'calendar',   label: 'Calendar',   icon: '📅', route: '/calendar' },
] as const;

export type SectionKey = typeof SECTIONS[number]['key'];

export function hasAccess(user: { blockedSections: string[] }, section: SectionKey): boolean {
  return !user.blockedSections.includes(section);
}

/** Call at the top of any protected page server component. Redirects if blocked. */
export function checkAccess(user: { role: string; blockedSections: string[] } | null, section: SectionKey) {
  if (!user) redirect('/auth/sign-in');
  // Admins always have full access
  if (user.role === 'ADMIN') return;
  if (user.blockedSections.includes(section)) {
    redirect(`/dashboard?blocked=${section}`);
  }
}
