'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Topic = { id: string; title: string; system: string; _count: { questions: number } };

const COUNT_OPTIONS = [10, 20, 40, 80];
const TIME_OPTIONS  = [
  { label: '20 min', sec: 1200 },
  { label: '40 min', sec: 2400 },
  { label: '90 min', sec: 5400 },
  { label: 'No limit', sec: 0 },
];

export function ExamConfig({ topics }: { topics: Topic[] }) {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [count, setCount]         = useState(20);
  const [timeSec, setTimeSec]     = useState(1200);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const allSelected = selectedTopics.size === 0;
  const totalAvailable = allSelected
    ? topics.reduce((s, t) => s + t._count.questions, 0)
    : [...selectedTopics].reduce((s, id) => s + (topics.find(t => t.id === id)?._count.questions ?? 0), 0);

  function toggleTopic(id: string) {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function start() {
    setError('');
    setLoading(true);
    const res = await fetch('/api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicIds: selectedTopics.size > 0 ? [...selectedTopics] : undefined,
        count: Math.min(count, totalAvailable),
        timeLimitSec: timeSec,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Failed to start exam.'); return; }
    router.push(`/exam/${data.sessionId}`);
  }

  // Group topics by system
  const systems = [...new Set(topics.map(t => t.system))].sort();

  return (
    <div className="exam-cfg">

      {/* Topics */}
      <div className="panel exam-cfg-panel">
        <h3>Topics <span className="muted exam-cfg-hint">Leave all unselected to include every topic</span></h3>
        <div className="exam-cfg-systems">
          {systems.map(sys => (
            <div key={sys} className="exam-cfg-system">
              <div className="exam-cfg-system-label kicker">{sys}</div>
              <div className="exam-cfg-topic-grid">
                {topics.filter(t => t.system === sys).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopic(t.id)}
                    className={`exam-cfg-topic-btn${selectedTopics.has(t.id) ? ' exam-cfg-topic-btn--active' : ''}`}
                  >
                    <span>{t.title}</span>
                    <span className="exam-cfg-topic-count">{t._count.questions}q</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Count + Time */}
      <div className="exam-cfg-row">
        <div className="panel exam-cfg-panel">
          <h3>Questions</h3>
          <div className="exam-cfg-pills">
            {COUNT_OPTIONS.map(n => (
              <button key={n} type="button"
                className={`exam-cfg-pill${count === n ? ' exam-cfg-pill--active' : ''}`}
                onClick={() => setCount(n)}
              >{n}</button>
            ))}
          </div>
          <p className="muted exam-cfg-avail">{totalAvailable} available — will use {Math.min(count, totalAvailable)}</p>
        </div>

        <div className="panel exam-cfg-panel">
          <h3>Time limit</h3>
          <div className="exam-cfg-pills">
            {TIME_OPTIONS.map(o => (
              <button key={o.sec} type="button"
                className={`exam-cfg-pill${timeSec === o.sec ? ' exam-cfg-pill--active' : ''}`}
                onClick={() => setTimeSec(o.sec)}
              >{o.label}</button>
            ))}
          </div>
          <p className="muted exam-cfg-avail">{timeSec > 0 ? `${Math.round(timeSec / 60)} minutes` : 'Untimed session'}</p>
        </div>
      </div>

      {error && <p className="admin-form-status admin-form-status--err">{error}</p>}

      <button type="button" className="btn primary exam-cfg-start" onClick={start} disabled={loading || totalAvailable === 0}>
        {loading ? 'Starting…' : `Start exam — ${Math.min(count, totalAvailable)} questions${timeSec > 0 ? `, ${Math.round(timeSec / 60)} min` : ''}`}
      </button>
    </div>
  );
}
