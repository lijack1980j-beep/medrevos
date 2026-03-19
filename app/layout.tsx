import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, Space_Mono } from 'next/font/google';
import { UserProvider } from '@/components/UserProvider';
import { MainNav } from '@/components/MainNav';
import { ShortcutModal } from '@/components/ShortcutModal';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ThemeColorApplier } from '@/components/ThemeColorApplier';

const pressStart2P = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-press-start', display: 'swap' });
const spaceMono    = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Glitch Signal',
  description: 'Glitch Signal projects represent a fusion of innovation, design precision, and modern thinking. Each project is developed with a clear vision, combining UI/UX, architectural concepts, and creative direction to deliver cohesive and impactful results. From digital platforms to physical spaces, every detail is carefully crafted to ensure functionality, aesthetic strength, and a seamless user or spatial experience.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Glitch Signal',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart2P.variable} ${spaceMono.variable}`}>
      <body>
        <UserProvider>
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
          <ThemeColorApplier />
        </UserProvider>
      </body>
    </html>
  );
}
