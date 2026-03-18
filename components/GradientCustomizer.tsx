'use client';

import { useState, useEffect } from 'react';
import { applyGradient } from './ThemeColorApplier';

interface GradColors { c1: string; c2: string; c3: string; }

const DARK_DEFAULT: GradColors = { c1: '#0a0a0f', c2: '#1a1025', c3: '#0f1629' };
const LIGHT_DEFAULT: GradColors = { c1: '#f8fafc', c2: '#e0e7ff', c3: '#f0f4ff' };

const DARK_PRESETS: (GradColors & { name: string })[] = [
  { name: 'Midnight',  c1: '#0a0a0f', c2: '#1a1025', c3: '#0f1629' },
  { name: 'Deep Navy', c1: '#05070f', c2: '#0c1a3a', c3: '#091225' },
  { name: 'Forest',    c1: '#050f08', c2: '#0d2015', c3: '#051810' },
  { name: 'Volcano',   c1: '#100505', c2: '#1e0a0a', c3: '#160808' },
  { name: 'Galaxy',    c1: '#07050f', c2: '#150d2a', c3: '#0a0820' },
  { name: 'Obsidian',  c1: '#0a0a0a', c2: '#141414', c3: '#0f0f0f' },
];

const LIGHT_PRESETS: (GradColors & { name: string })[] = [
  { name: 'Arctic',   c1: '#f8fafc', c2: '#e0e7ff', c3: '#f0f4ff' },
  { name: 'Warm',     c1: '#fffbf5', c2: '#fef3c7', c3: '#fff8ee' },
  { name: 'Rose',     c1: '#fff5f5', c2: '#ffe4e6', c3: '#fff0f3' },
  { name: 'Mint',     c1: '#f0fdf4', c2: '#dcfce7', c3: '#ecfdf5' },
  { name: 'Sky',      c1: '#f0f9ff', c2: '#bae6fd', c3: '#e0f2fe' },
  { name: 'Lavender', c1: '#faf5ff', c2: '#ede9fe', c3: '#f5f3ff' },
];

function gradPreview(g: GradColors) {
  return `linear-gradient(135deg, ${g.c1} 0%, ${g.c2} 50%, ${g.c3} 100%)`;
}

function isMatch(a: GradColors, b: GradColors) {
  return a.c1 === b.c1 && a.c2 === b.c2 && a.c3 === b.c3;
}

export function GradientCustomizer() {
  const [darkGrad, setDarkGrad] = useState<GradColors>(DARK_DEFAULT);
  const [lightGrad, setLightGrad] = useState<GradColors>(LIGHT_DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('gradDark');
    const l = localStorage.getItem('gradLight');
    if (d) setDarkGrad(JSON.parse(d));
    if (l) setLightGrad(JSON.parse(l));
  }, []);

  function pick(mode: 'dark' | 'light', grad: GradColors) {
    const newDark  = mode === 'dark'  ? grad : darkGrad;
    const newLight = mode === 'light' ? grad : lightGrad;
    if (mode === 'dark')  setDarkGrad(grad);
    else                  setLightGrad(grad);
    applyGradient(newDark, newLight);
  }

  function pickStop(mode: 'dark' | 'light', stop: keyof GradColors, color: string) {
    const base = mode === 'dark' ? darkGrad : lightGrad;
    pick(mode, { ...base, [stop]: color });
  }

  function save() {
    localStorage.setItem('gradDark',  JSON.stringify(darkGrad));
    localStorage.setItem('gradLight', JSON.stringify(lightGrad));
    applyGradient(darkGrad, lightGrad);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    setDarkGrad(DARK_DEFAULT);
    setLightGrad(LIGHT_DEFAULT);
    localStorage.removeItem('gradDark');
    localStorage.removeItem('gradLight');
    applyGradient(DARK_DEFAULT, LIGHT_DEFAULT);
  }

  return (
    <div className="gc-root">

      {/* Dark gradient */}
      <div className="gc-section">
        <div className="gc-section-header">
          <span className="gc-mode-label">Dark mode background</span>
          <div className="gc-preview-strip" style={{ background: gradPreview(darkGrad) }} />
        </div>
        <div className="gc-presets">
          {DARK_PRESETS.map(p => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              className={`gc-preset${isMatch(darkGrad, p) ? ' gc-preset--active' : ''}`}
              style={{ background: gradPreview(p) }}
              onClick={() => pick('dark', { c1: p.c1, c2: p.c2, c3: p.c3 })}
            >
              <span className="gc-preset-label">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="gc-stops">
          {(['c1', 'c2', 'c3'] as const).map((stop, i) => (
            <label key={stop} className="gc-stop-label">
              <span className="gc-stop-name">Stop {i + 1}</span>
              <input
                type="color"
                value={darkGrad[stop]}
                onChange={e => pickStop('dark', stop, e.target.value)}
                className="gc-color-input"
                title={`Dark gradient stop ${i + 1}`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Light gradient */}
      <div className="gc-section">
        <div className="gc-section-header">
          <span className="gc-mode-label">Light mode background</span>
          <div className="gc-preview-strip" style={{ background: gradPreview(lightGrad) }} />
        </div>
        <div className="gc-presets">
          {LIGHT_PRESETS.map(p => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              className={`gc-preset${isMatch(lightGrad, p) ? ' gc-preset--active' : ''}`}
              style={{ background: gradPreview(p) }}
              onClick={() => pick('light', { c1: p.c1, c2: p.c2, c3: p.c3 })}
            >
              <span className="gc-preset-label">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="gc-stops">
          {(['c1', 'c2', 'c3'] as const).map((stop, i) => (
            <label key={stop} className="gc-stop-label">
              <span className="gc-stop-name">Stop {i + 1}</span>
              <input
                type="color"
                value={lightGrad[stop]}
                onChange={e => pickStop('light', stop, e.target.value)}
                className="gc-color-input"
                title={`Light gradient stop ${i + 1}`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="gc-actions">
        <button type="button" className="btn gc-reset-btn" onClick={reset}>Reset defaults</button>
        <button type="button" className="btn primary" onClick={save}>
          {saved ? '✓ Saved' : 'Apply & save'}
        </button>
      </div>
    </div>
  );
}
