'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = ['Welcome', 'Exam date', 'Start'] as const;

export function OnboardingModal({ userName }: { userName: string }) {
  const [show, setShow]     = useState(false);
  const [step, setStep]     = useState(0);
  const [date, setDate]     = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('onboardingDone')) setShow(true);
  }, []);

  async function saveDate() {
    if (!date) { next(); return; }
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examDate: date }),
    });
    setSaving(false);
    next();
  }

  function next() { setStep(s => s + 1); }

  function finish(href: string) {
    localStorage.setItem('onboardingDone', '1');
    setShow(false);
    router.push(href as any);
  }

  function skip() {
    localStorage.setItem('onboardingDone', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="ob-overlay">
      <div className="ob-modal">

        {/* Progress dots */}
        <div className="ob-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`ob-dot${i === step ? ' ob-dot--active' : i < step ? ' ob-dot--done' : ''}`} />
          ))}
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="ob-step">
            <div className="ob-icon">👋</div>
            <h2 className="ob-title">Welcome, {userName.split(' ')[0]}!</h2>
            <p className="ob-desc">Med Revision OS is your personalised study companion. Let&rsquo;s get you set up in 2 quick steps.</p>
            <button type="button" className="btn primary ob-btn" onClick={next}>Get started</button>
            <button type="button" className="ob-skip" onClick={skip}>Skip setup</button>
          </div>
        )}

        {/* Step 1 — Exam date */}
        {step === 1 && (
          <div className="ob-step">
            <div className="ob-icon">📅</div>
            <h2 className="ob-title">When is your exam?</h2>
            <p className="ob-desc">Setting your exam date unlocks the readiness projection and countdown in Analytics and Dashboard.</p>
            <input
              type="date"
              className="ob-date-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              aria-label="Exam date"
              title="Exam date"
            />
            <button type="button" className="btn primary ob-btn" onClick={saveDate} disabled={saving}>
              {saving ? 'Saving…' : date ? 'Save & continue' : 'Skip for now'}
            </button>
          </div>
        )}

        {/* Step 2 — Choose starting point */}
        {step === 2 && (
          <div className="ob-step">
            <div className="ob-icon">🚀</div>
            <h2 className="ob-title">Where do you want to start?</h2>
            <p className="ob-desc">Pick one — you can always switch later.</p>
            <div className="ob-options">
              <button type="button" className="ob-option" onClick={() => finish('/quick')}>
                <span className="ob-option-icon">⚡</span>
                <div><strong>Quick flashcards</strong><span>AI-generated cards on any topic</span></div>
              </button>
              <button type="button" className="ob-option" onClick={() => finish('/study')}>
                <span className="ob-option-icon">📖</span>
                <div><strong>Study a topic</strong><span>High-yield lessons with notes</span></div>
              </button>
              <button type="button" className="ob-option" onClick={() => finish('/questions')}>
                <span className="ob-option-icon">📝</span>
                <div><strong>Question bank</strong><span>Practice exam-style MCQs</span></div>
              </button>
              <button type="button" className="ob-option" onClick={() => finish('/dashboard')}>
                <span className="ob-option-icon">📊</span>
                <div><strong>Dashboard</strong><span>See my progress overview</span></div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
