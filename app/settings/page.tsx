'use client';

import { useState, useEffect } from 'react';
import { ThemeCustomizer } from '@/components/ThemeCustomizer';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyGoal, setDailyGoal] = useState('20');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.examDate) setExamDate(d.examDate.slice(0, 10));
        if (d.name) setName(d.name);
      });
    const stored = localStorage.getItem('dailyGoal');
    if (stored) setDailyGoal(stored);
  }, []);

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examDate: examDate || null, name: name || undefined }),
    });
    if (res.ok) {
      localStorage.setItem('dailyGoal', dailyGoal);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError('Failed to save — please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="settings-page">
      <div>
        <div className="kicker">Preferences</div>
        <h1>Settings</h1>
        <p className="muted">Manage your profile, exam date, and study goals.</p>
      </div>

      <div className="settings-grid">

        <div className="panel settings-section">
          <h3 className="settings-section-title">Profile</h3>

          <div className="settings-field">
            <label className="settings-label">Display name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="settings-input"
            />
          </div>
        </div>

        <div className="panel settings-section">
          <h3 className="settings-section-title">Exam</h3>

          <div className="settings-field">
            <label className="settings-label">Exam date</label>
            <input
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="settings-input"
            />
            <p className="settings-hint">Used for the exam countdown and readiness projection in Analytics.</p>
          </div>
        </div>

        <div className="panel settings-section">
          <h3 className="settings-section-title">Daily Goal</h3>

          <div className="settings-field">
            <label className="settings-label">Questions per day</label>
            <div className="settings-goal-pills">
              {['10', '20', '30', '40', '50'].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`settings-goal-pill${dailyGoal === n ? ' settings-goal-pill--active' : ''}`}
                  onClick={() => setDailyGoal(n)}
                >{n}</button>
              ))}
            </div>
            <p className="settings-hint">Shown in the dashboard and quick stats.</p>
          </div>
        </div>

      </div>

        <div className="panel settings-section">
          <h3 className="settings-section-title">Accent color</h3>
          <p className="settings-hint" style={{ marginBottom: 16 }}>Customize the accent color for dark and light modes. Changes apply instantly as a live preview.</p>
          <ThemeCustomizer />
        </div>

      </div>

      <div className="settings-save-row">
        {error && <span className="settings-error">{error}</span>}
        {saved && <span className="settings-saved">Saved!</span>}
        <button type="button" className="btn primary settings-save-btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
