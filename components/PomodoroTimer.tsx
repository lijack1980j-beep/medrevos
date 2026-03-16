'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const WORK_SEC  = 25 * 60;
const BREAK_SEC =  5 * 60;
const R = 54;
const CIRC = 2 * Math.PI * R;

export function PomodoroTimer() {
  const [open,    setOpen]    = useState(false);
  const [secs,    setSecs]    = useState(WORK_SEC);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [cycles,  setCycles]  = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setSecs(s => {
      if (s <= 1) {
        setRunning(false);
        setIsBreak(b => {
          const next = !b;
          setSecs(next ? BREAK_SEC : WORK_SEC);
          if (!next) setCycles(c => c + 1);
          return next;
        });
        return s;
      }
      return s - 1;
    });
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  function reset() {
    setRunning(false);
    setIsBreak(false);
    setSecs(WORK_SEC);
  }

  const mins    = String(Math.floor(secs / 60)).padStart(2, '0');
  const seconds = String(secs % 60).padStart(2, '0');
  const total   = isBreak ? BREAK_SEC : WORK_SEC;
  const offset  = CIRC * (secs / total);
  const color   = isBreak ? '#34d399' : '#60a5fa';

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        className={`pomo-fab${open ? ' pomo-fab--open' : ''}${isBreak ? ' pomo-fab--break' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Pomodoro timer"
      >
        {running
          ? <span className="pomo-fab-time">{mins}:{seconds}</span>
          : <span className="pomo-fab-icon">🍅</span>
        }
      </button>

      {/* Panel */}
      {open && (
        <div className={`pomo-panel${isBreak ? ' pomo-panel--break' : ''}`}>

          {/* Header */}
          <div className="pomo-header">
            <div className="pomo-mode">
              <span className={`pomo-mode-dot${isBreak ? ' pomo-mode-dot--break' : ''}`} />
              <span className="pomo-mode-label">{isBreak ? 'Break time' : 'Focus session'}</span>
            </div>
            <button type="button" className="pomo-close" onClick={() => setOpen(false)} title="Close">✕</button>
          </div>

          {/* Ring */}
          <div className="pomo-ring-wrap">
            <svg className="pomo-ring" viewBox="0 0 128 128">
              {/* Track */}
              <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              {/* Progress */}
              <circle
                cx="64" cy="64" r={R}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <div className="pomo-center">
              <div className="pomo-time">{mins}:{seconds}</div>
              <div className="pomo-sublabel">{isBreak ? 'rest' : 'work'}</div>
            </div>
          </div>

          {/* Cycles */}
          <div className="pomo-cycles-row">
            {Array.from({ length: Math.max(4, cycles + 1) }).map((_, i) => (
              <span key={i} className={`pomo-cycle-pip${i < cycles ? ' pomo-cycle-pip--done' : ''}`} />
            ))}
            <span className="pomo-cycles-label">{cycles} cycle{cycles !== 1 ? 's' : ''}</span>
          </div>

          {/* Controls */}
          <div className="pomo-controls">
            <button
              type="button"
              className={`pomo-btn-main${running ? ' pomo-btn-main--pause' : ''}`}
              onClick={() => setRunning(v => !v)}
            >
              {running ? '⏸ Pause' : '▶ Start'}
            </button>
            <button type="button" className="pomo-btn-reset" onClick={reset} title="Reset">↺</button>
          </div>

        </div>
      )}
    </>
  );
}
