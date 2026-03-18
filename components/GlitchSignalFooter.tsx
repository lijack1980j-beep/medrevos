'use client';

import { useState } from 'react';

const navItems = [
  { label: 'Home',       sup: null,   href: '/' },
  { label: 'Dashboard',  sup: null,   href: '/dashboard' },
  { label: 'Qbank',      sup: null,   href: '/questions' },
  { label: 'Flashcards', sup: null,   href: '/flashcards' },
  { label: 'Analytics',  sup: null,   href: '/analytics' },
];

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export function GlitchSignalFooter() {
  const [hovered,   setHovered]   = useState<string | null>(null);
  const [iconHover, setIconHover] = useState(false);

  return (
    <footer className="gsf-wrapper">
      <div className="gsf-border">

        {/* Top row */}
        <div className="gsf-top">

          {/* Left */}
          <div className="gsf-left">
            <span className="gsf-stay">Stay Connected.</span>
            <a href="/" className="gsf-url">
              MEDREVISION OS<br />V2 · POWERED BY AI
            </a>
            <p className="gsf-desc">
              A complete medical revision platform — spaced repetition, exam-style Qbank,
              clinical cases, readiness analytics, and AI-generated content. Built for serious students.
            </p>
            <span className="gsf-made">Built for medical students &middot; Powered by Claude</span>
          </div>

          {/* Middle — nav */}
          <nav className="gsf-mid">
            {navItems.map(item => (
              <a
                key={item.label}
                href={item.href}
                className={`gsf-nav-link${hovered === item.label ? ' gsf-nav-link--hovered' : ''}`}
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
              >
                {item.label}
                {item.sup && <span className="gsf-sup">{item.sup}</span>}
              </a>
            ))}
          </nav>

          {/* Right — social */}
          <div className="gsf-right">
            <span className="gsf-social-label">Social Media</span>
            <button
              type="button"
              className={`gsf-icon-btn${iconHover ? ' gsf-icon-btn--hovered' : ''}`}
              onMouseEnter={() => setIconHover(true)}
              onMouseLeave={() => setIconHover(false)}
              aria-label="Instagram"
              onClick={() => window.open('https://instagram.com', '_blank')}
            >
              <InstagramIcon />
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="gsf-bottom">
          <div className="gsf-big-title">Med<br />Revision</div>
          <span className="gsf-copy">&copy;{new Date().getFullYear()} MedRevision OS. All rights reserved.</span>
        </div>

        <div className="gsf-accent-line" />
      </div>
    </footer>
  );
}
