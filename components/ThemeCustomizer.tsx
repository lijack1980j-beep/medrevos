'use client';

import { useState, useEffect } from 'react';
import { applyThemeColors } from './ThemeColorApplier';

const DARK_PRESETS = [
  { name: 'Indigo',  color: '#6366f1' },
  { name: 'Blue',    color: '#60a5fa' },
  { name: 'Emerald', color: '#34d399' },
  { name: 'Violet',  color: '#a78bfa' },
  { name: 'Pink',    color: '#f472b6' },
  { name: 'Orange',  color: '#fb923c' },
  { name: 'Cyan',    color: '#22d3ee' },
  { name: 'Rose',    color: '#fb7185' },
];

const LIGHT_PRESETS = [
  { name: 'Blue',    color: '#2563eb' },
  { name: 'Indigo',  color: '#4f46e5' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Violet',  color: '#7c3aed' },
  { name: 'Rose',    color: '#e11d48' },
  { name: 'Orange',  color: '#ea580c' },
  { name: 'Teal',    color: '#0891b2' },
  { name: 'Fuchsia', color: '#a21caf' },
];

export function ThemeCustomizer() {
  const [darkAccent,  setDarkAccent]  = useState('#6366f1');
  const [lightAccent, setLightAccent] = useState('#2563eb');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDarkAccent(localStorage.getItem('themeAccentDark')   ?? '#6366f1');
    setLightAccent(localStorage.getItem('themeAccentLight') ?? '#2563eb');
  }, []);

  function pick(mode: 'dark' | 'light', color: string) {
    if (mode === 'dark')  setDarkAccent(color);
    else                  setLightAccent(color);
    // Live preview
    const storedDark  = mode === 'dark'  ? color : (localStorage.getItem('themeAccentDark')  ?? '#6366f1');
    const storedLight = mode === 'light' ? color : (localStorage.getItem('themeAccentLight') ?? '#2563eb');
    applyThemeColors(storedDark, storedLight);
  }

  function save() {
    localStorage.setItem('themeAccentDark',  darkAccent);
    localStorage.setItem('themeAccentLight', lightAccent);
    applyThemeColors(darkAccent, lightAccent);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    const dark = '#6366f1', light = '#2563eb';
    setDarkAccent(dark);
    setLightAccent(light);
    localStorage.removeItem('themeAccentDark');
    localStorage.removeItem('themeAccentLight');
    applyThemeColors(dark, light);
  }

  return (
    <div className="tcc-root">

      {/* Dark mode */}
      <div className="tcc-section">
        <div className="tcc-section-header">
          <span className="tcc-mode-label">Dark mode accent</span>
          <span className="tcc-preview-pill" style={{ background: darkAccent }} />
        </div>
        <div className="tcc-swatches">
          {DARK_PRESETS.map(p => (
            <button
              key={p.color}
              type="button"
              title={p.name}
              className={`tcc-swatch${darkAccent === p.color ? ' tcc-swatch--active' : ''}`}
              style={{ background: p.color, boxShadow: darkAccent === p.color ? `0 0 0 3px ${p.color}44, 0 0 0 5px #fff2` : undefined }}
              onClick={() => pick('dark', p.color)}
            />
          ))}
          <label className="tcc-custom" title="Custom color">
            <input
              type="color"
              value={darkAccent}
              onChange={e => pick('dark', e.target.value)}
              className="tcc-color-input"
            />
            <span className="tcc-custom-icon">✎</span>
          </label>
        </div>
      </div>

      {/* Light mode */}
      <div className="tcc-section">
        <div className="tcc-section-header">
          <span className="tcc-mode-label">Light mode accent</span>
          <span className="tcc-preview-pill" style={{ background: lightAccent }} />
        </div>
        <div className="tcc-swatches">
          {LIGHT_PRESETS.map(p => (
            <button
              key={p.color}
              type="button"
              title={p.name}
              className={`tcc-swatch${lightAccent === p.color ? ' tcc-swatch--active' : ''}`}
              style={{ background: p.color, boxShadow: lightAccent === p.color ? `0 0 0 3px ${p.color}44, 0 0 0 5px #0002` : undefined }}
              onClick={() => pick('light', p.color)}
            />
          ))}
          <label className="tcc-custom" title="Custom color">
            <input
              type="color"
              value={lightAccent}
              onChange={e => pick('light', e.target.value)}
              className="tcc-color-input"
            />
            <span className="tcc-custom-icon">✎</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="tcc-actions">
        <button type="button" className="btn tcc-reset-btn" onClick={reset}>Reset defaults</button>
        <button type="button" className="btn primary" onClick={save}>
          {saved ? '✓ Saved' : 'Apply & save'}
        </button>
      </div>
    </div>
  );
}
