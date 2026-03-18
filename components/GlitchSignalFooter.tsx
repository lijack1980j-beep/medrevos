'use client';

import { useState } from 'react';

const navItems = [
  { label: 'Home',       sup: null,   href: 'https://glitchsignal.framer.website/' },
  { label: 'About',      sup: null,   href: 'https://glitchsignal.framer.website/about' },
  { label: 'Projects',   sup: '08',   href: 'https://glitchsignal.framer.website/projects' },
  { label: 'Journal',    sup: '05',   href: 'https://glitchsignal.framer.website/journal' },
  { label: 'Contact us', sup: null,   href: 'https://glitchsignal.framer.website/contact' },
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
            <a href="https://magasin-three.vercel.app/" target="_blank" rel="noopener noreferrer" className="gsf-url">
              HTTPS://MAGASIN-T<br />HREE.VERCEL.APP/
            </a>
            <p className="gsf-desc">
              Glitch Signal projects represent a fusion of innovation,
              design precision, and modern thinking. Each project is
              developed with a clear vision, combining UI/UX,
              architectural concepts, and creative direction to deliver
              cohesive and impactful results. From digital platforms to
              physical spaces, every detail is carefully crafted to ensure
              functionality, aesthetic strength, and a seamless user or
              spatial experience.
            </p>
            <span className="gsf-made">Made with creative idea &nbsp; Patience steam</span>
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
              onClick={() => window.open('https://www.instagram.com/glitch_signal/', '_blank')}
            >
              <InstagramIcon />
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="gsf-bottom">
          <div className="gsf-big-title">Glitch<br />Signal</div>
          <span className="gsf-copy">&copy;2025 GlitchSignal Studio. All right reserved.</span>
        </div>

        <div className="gsf-accent-line" />
      </div>
    </footer>
  );
}
