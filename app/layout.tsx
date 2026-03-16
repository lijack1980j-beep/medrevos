import './globals.css';
import type { Metadata } from 'next';
import { MainNav } from '@/components/MainNav';

export const metadata: Metadata = {
  title: 'Med Revision OS V2',
  description: 'A medical revision platform with auth, analytics, admin CRUD, Qbank, spaced repetition, and cases.'
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
      </body>
    </html>
  );
}
