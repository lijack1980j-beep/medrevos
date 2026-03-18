'use client';

import { useEffect } from 'react';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function applyThemeColors(darkAccent: string, lightAccent: string) {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') !== 'light';
  const accent = isDark ? darkAccent : lightAccent;
  const a = isDark ? 0.35 : 0.25;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-glow', hexToRgba(accent, a));
  root.style.setProperty('--border-glow', hexToRgba(accent, 0.2));
  root.style.setProperty('--shadow-glow', `0 0 40px ${hexToRgba(accent, isDark ? 0.15 : 0.1)}`);
  root.style.setProperty('--shadow-glow-strong', `0 0 60px ${hexToRgba(accent, isDark ? 0.3 : 0.2)}`);
}

export function applyGradient(
  dark: { c1: string; c2: string; c3: string },
  light: { c1: string; c2: string; c3: string }
) {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') !== 'light';
  const g = isDark ? dark : light;
  root.style.setProperty('--grad-1', g.c1);
  root.style.setProperty('--grad-2', g.c2);
  root.style.setProperty('--grad-3', g.c3);
}

export function ThemeColorApplier() {
  useEffect(() => {
    function apply() {
      const dark  = localStorage.getItem('themeAccentDark')  ?? '#6366f1';
      const light = localStorage.getItem('themeAccentLight') ?? '#2563eb';
      applyThemeColors(dark, light);

      // Re-apply gradient for current theme
      const storedGradDark  = localStorage.getItem('gradDark');
      const storedGradLight = localStorage.getItem('gradLight');
      applyGradient(
        storedGradDark  ? JSON.parse(storedGradDark)  : { c1: '#0a0a0f', c2: '#1a1025', c3: '#0f1629' },
        storedGradLight ? JSON.parse(storedGradLight) : { c1: '#f8fafc', c2: '#e0e7ff', c3: '#f0f4ff' }
      );
    }

    apply();

    // Re-apply when user switches dark/light mode
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
