import './globals.css';
import type { Metadata, Viewport } from 'next';
import { MainNav } from '@/components/MainNav';
import { ShortcutModal } from '@/components/ShortcutModal';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Med Revision OS V2',
  description: 'A medical revision platform with auth, analytics, admin CRUD, Qbank, spaced repetition, and cases.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MedRevision',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />
        <div className="page-shell">
          <MainNav />
          <main className="main-content">{children}</main>
        </div>
        <ShortcutModal />
        <PomodoroTimer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
