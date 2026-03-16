'use client';

import { useEffect, useState } from 'react';

export function DailyGoalWidget({ todayAttempts }: { todayAttempts: number }) {
  const [goal, setGoal] = useState(20);

  useEffect(() => {
    const stored = localStorage.getItem('dailyGoal');
    if (stored) setGoal(parseInt(stored));
  }, []);

  const pct     = Math.min(100, Math.round((todayAttempts / goal) * 100));
  const done    = todayAttempts >= goal;
  const band    = done ? 'done' : pct >= 60 ? 'progress' : 'start';

  return (
    <div className={`dg-widget dg-widget--${band}`}>
      <div className="dg-top">
        <span className="dg-label">Daily goal</span>
        <span className="dg-count">{todayAttempts} <span className="dg-goal-of">/ {goal} Qs</span></span>
      </div>
      <div className="dg-bar-track">
        <div className="dg-bar-fill" style={{ '--w': `${pct}%` } as React.CSSProperties} />
      </div>
      <div className="dg-bottom">
        {done
          ? <span className="dg-done-label">Goal complete! ⚡</span>
          : <span className="dg-remain">{goal - todayAttempts} questions to go</span>
        }
        <span className="dg-pct">{pct}%</span>
      </div>
    </div>
  );
}
