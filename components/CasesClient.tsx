'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Case = {
  id: string;
  title: string;
  chiefComplaint: string;
  findings: string;
  investigations: string;
  diagnosis: string;
  management: string;
  topic: { title: string; system: string };
};

function CaseCard({ c }: { c: Case }) {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (!started) {
      setStarted(true);
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    }
  }, [started]);

  function finish() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDone(true);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  useEffect(() => {
    const stored = localStorage.getItem(`case-rating-${c.id}`);
    if (stored) setRating(parseInt(stored));
  }, [c.id]);

  function rateCase(stars: number) {
    setRating(stars);
    localStorage.setItem(`case-rating-${c.id}`, String(stars));
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="case-card cases-card" onClick={startTimer}>

      <div className="cases-card-header">
        <span className="badge">{c.topic.title}</span>
        <div className="cases-card-title-row">
          <h3 className="cases-card-title">{c.title}</h3>
          {started && (
            <span className={`cases-timer${done ? ' cases-timer--done' : ''}`}>
              {done ? `Done · ${mins}:${secs}` : `${mins}:${secs}`}
            </span>
          )}
        </div>
      </div>

      <div className="cases-section">
        <div className="cases-section-label">Chief Complaint</div>
        <p className="cases-section-text">{c.chiefComplaint}</p>
      </div>

      <details className="cases-reveal" onToggle={e => { if ((e.target as HTMLDetailsElement).open) startTimer(); }}>
        <summary className="cases-reveal-trigger">
          <span>Findings &amp; Investigations</span>
          <span className="cases-reveal-icon">▾</span>
        </summary>
        <div className="cases-reveal-body">
          <div className="cases-section">
            <div className="cases-section-label">Findings</div>
            <p className="cases-section-text">{c.findings}</p>
          </div>
          <div className="cases-section">
            <div className="cases-section-label">Investigations</div>
            <p className="cases-section-text">{c.investigations}</p>
          </div>
        </div>
      </details>

      <details className="cases-reveal cases-reveal--answer" onToggle={e => { if ((e.target as HTMLDetailsElement).open) startTimer(); }}>
        <summary className="cases-reveal-trigger">
          <span>Diagnosis &amp; Management</span>
          <span className="cases-reveal-icon">▾</span>
        </summary>
        <div className="cases-reveal-body">
          <div className="cases-section">
            <div className="cases-section-label cases-section-label--dx">Diagnosis</div>
            <p className="cases-section-text">{c.diagnosis}</p>
          </div>
          <div className="cases-section">
            <div className="cases-section-label cases-section-label--rx">Management</div>
            <p className="cases-section-text">{c.management}</p>
          </div>
          {!done && (
            <button type="button" className="btn cases-done-btn" onClick={e => { e.stopPropagation(); finish(); }}>
              Mark as done
            </button>
          )}
        </div>
      </details>

      {done && (
        <div className="cases-rating">
          <span className="cases-rating-label">Difficulty:</span>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              className={`cases-star${rating >= star ? ' cases-star--active' : ''}`}
              onClick={e => { e.stopPropagation(); rateCase(star); }}
              title={`Rate ${star}/5`}
            >★</button>
          ))}
          {rating > 0 && <span className="cases-rating-val">{rating}/5</span>}
        </div>
      )}
    </div>
  );
}

export function CasesClient({ grouped }: { grouped: Record<string, Case[]> }) {
  return (
    <>
      {Object.entries(grouped).map(([system, systemCases]) => (
        <section key={system} className="grid cases-system-section">
          <div className="cases-system-heading">
            <span className="kicker">{system}</span>
            <span className="cases-system-count">{systemCases.length} case{systemCases.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid cols-2">
            {systemCases.map(c => <CaseCard key={c.id} c={c} />)}
          </div>
        </section>
      ))}
    </>
  );
}
