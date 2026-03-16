'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExamProgressFill } from '@/components/ExamProgressFill';

type Option   = { id: string; label: string; text: string };
type Question = { answerId: string; questionId: string; stem: string; options: Option[]; topic: { title: string; system: string } };

export function ExamSession({ sessionId, questions, timeLimitSec, startedAt }: {
  sessionId: string;
  questions: Question[];
  timeLimitSec: number;
  startedAt: string;
}) {
  const router  = useRouter();
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flagged, setFlagged]   = useState<Set<number>>(new Set());
  const submitted = useRef(false);

  // Timer
  useEffect(() => {
    if (timeLimitSec === 0) return;
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const remaining = Math.max(0, timeLimitSec - elapsed);
    setTimeLeft(remaining);
    if (remaining === 0) { submitExam(); return; }
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(id); submitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitExam() {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    await fetch(`/api/exam/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    router.push(`/exam/${sessionId}/results`);
  }

  function select(questionId: string, optionId: string) {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }

  function toggleFlag(i: number) {
    setFlagged(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  // Keyboard shortcuts: 1–4 select option, F flag, ←/→ navigate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const q2 = questions[current];
      if (!q2) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= q2.options.length) {
        select(q2.questionId, q2.options[num - 1].id);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFlag(current);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrent(i => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrent(i => Math.max(0, i - 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, questions]);

  const q        = questions[current];
  const answered = Object.keys(answers).length;
  const pct      = Math.round((answered / questions.length) * 100);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const timerUrgent = timeLeft !== null && timeLeft < 120;

  return (
    <div className="exam-session">

      {/* Top bar */}
      <div className="exam-topbar">
        <span className="exam-topbar-title">Timed Exam</span>
        <div className="exam-topbar-center">
          <div className="exam-progress-track">
            <ExamProgressFill pct={pct} />
          </div>
          <span className="exam-topbar-count">{answered}/{questions.length} answered</span>
        </div>
        {timeLeft !== null && (
          <span className={`exam-timer${timerUrgent ? ' exam-timer--urgent' : ''}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
        )}
        {timeLeft === null && <span className="exam-timer">Untimed</span>}
      </div>

      <div className="exam-body">

        {/* Question navigator */}
        <div className="exam-nav-panel">
          <div className="exam-nav-title">Questions</div>
          <div className="exam-nav-grid">
            {questions.map((q2, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={[
                  'exam-nav-btn',
                  i === current   ? 'exam-nav-btn--current' : '',
                  answers[q2.questionId] ? 'exam-nav-btn--answered' : '',
                  flagged.has(i)  ? 'exam-nav-btn--flagged' : '',
                ].filter(Boolean).join(' ')}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="exam-nav-legend">
            <span className="exam-legend-item"><span className="exam-nav-btn exam-nav-btn--answered exam-legend-dot" />Answered</span>
            <span className="exam-legend-item"><span className="exam-nav-btn exam-nav-btn--flagged exam-legend-dot" />Flagged</span>
          </div>
          <button type="button" className="btn primary exam-submit-btn" onClick={submitExam} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit exam'}
          </button>
        </div>

        {/* Question */}
        <div className="exam-question-panel">
          <div className="exam-q-meta">
            <span className="badge">{q.topic.system}</span>
            <span className="badge">{q.topic.title}</span>
            <span className="muted exam-q-num">Q{current + 1} of {questions.length}</span>
            <button
              type="button"
              className={`exam-flag-btn${flagged.has(current) ? ' exam-flag-btn--active' : ''}`}
              onClick={() => toggleFlag(current)}
              title="Flag for review"
            >
              {flagged.has(current) ? '🚩 Flagged' : '⚑ Flag'}
            </button>
          </div>

          <p className="exam-q-stem">{q.stem}</p>

          <div className="exam-options">
            {q.options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => select(q.questionId, opt.id)}
                className={`exam-option${answers[q.questionId] === opt.id ? ' exam-option--selected' : ''}`}
              >
                <span className="exam-option-label">{opt.label}.</span>
                <span>{opt.text}</span>
              </button>
            ))}
          </div>

          <div className="exam-q-nav">
            <button type="button" className="btn" onClick={() => setCurrent(i => Math.max(0, i - 1))} disabled={current === 0}>
              ← Previous
            </button>
            <button type="button" className="btn primary" onClick={() => setCurrent(i => Math.min(questions.length - 1, i + 1))} disabled={current === questions.length - 1}>
              Next →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
