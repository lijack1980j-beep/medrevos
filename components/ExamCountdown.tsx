'use client';

import { useState } from 'react';

export function ExamCountdown({ examDate }: { examDate: string | null }) {
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(examDate ? examDate.slice(0, 10) : '');
  const [saving,  setSaving]    = useState(false);

  const days = examDate
    ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000)
    : null;

  async function save() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examDate: value || null }),
    });
    setSaving(false);
    setEditing(false);
    // Refresh to update displayed value
    window.location.reload();
  }

  if (editing) {
    return (
      <div className="exam-countdown exam-countdown--editing">
        <input
          type="date"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="exam-countdown-input"
          min={new Date().toISOString().slice(0, 10)}
        />
        <button type="button" className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Set date'}
        </button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    );
  }

  if (days === null) {
    return (
      <button type="button" className="exam-countdown exam-countdown--unset" onClick={() => setEditing(true)}>
        + Set exam date
      </button>
    );
  }

  const urgency = days <= 7 ? 'urgent' : days <= 30 ? 'soon' : 'normal';

  return (
    <div className={`exam-countdown exam-countdown--${urgency}`} onClick={() => setEditing(true)} title="Click to change exam date">
      {days > 0
        ? <><span className="exam-countdown-days">{days}</span> day{days !== 1 ? 's' : ''} to exam</>
        : days === 0 ? 'Exam today!' : 'Exam has passed'}
    </div>
  );
}
