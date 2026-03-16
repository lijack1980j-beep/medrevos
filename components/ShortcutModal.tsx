'use client';

import { useEffect, useState, useCallback } from 'react';

const SHORTCUTS = [
  { page: 'Flashcards', keys: [['Space', 'Flip card'], ['→', 'Next card'], ['←', 'Prev card'], ['G', 'Mark "Got it"']] },
  { page: 'Quick Flashcards', keys: [['Space / Enter', 'Flip card'], ['→', 'Next'], ['←', 'Prev'], ['G', '"Got it"'], ['1–4', 'MCQ answer'], ['Ctrl+Enter', 'Generate cards']] },
  { page: 'Question Bank', keys: [['1–4', 'Select option'], ['Enter', 'Submit / Next']] },
  { page: 'Global', keys: [['?', 'Show this help'], ['Esc', 'Close modal']] },
];

export function ShortcutModal() {
  const [open, setOpen] = useState(false);

  const onKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) setOpen(v => !v);
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal shortcut-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Keyboard Shortcuts</h3>
          <button type="button" className="modal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="shortcut-sections">
          {SHORTCUTS.map(section => (
            <div key={section.page} className="shortcut-section">
              <div className="shortcut-section-title">{section.page}</div>
              <div className="shortcut-rows">
                {section.keys.map(([key, desc]) => (
                  <div key={key} className="shortcut-row">
                    <kbd className="kbd">{key}</kbd>
                    <span className="shortcut-desc">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="shortcut-hint muted">Press <kbd className="kbd">?</kbd> anywhere to toggle this panel.</p>
      </div>
    </div>
  );
}
