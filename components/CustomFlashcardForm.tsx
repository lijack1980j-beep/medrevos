'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Topic = { id: string; title: string; system: string };

export function CustomFlashcardForm({ topics }: { topics: Topic[] }) {
  const router                = useRouter();
  const [open, setOpen]       = useState(false);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const [front, setFront]     = useState('');
  const [back, setBack]       = useState('');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [added, setAdded]     = useState(0); // count of cards added this session

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !topicId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/flashcards/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, front: front.trim(), back: back.trim(), note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setFront('');
      setBack('');
      setNote('');
      setAdded(n => n + 1);
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    setOpen(o => !o);
    setError('');
  }

  return (
    <div className="cf-inline-wrap">
      <div className="cf-inline-trigger">
        <button type="button" className={`btn${open ? ' secondary' : ' primary'}`} onClick={toggle}>
          {open ? '✕ Cancel' : '+ Quick add flashcard'}
        </button>
        {added > 0 && !open && (
          <span className="cf-added-count">{added} card{added !== 1 ? 's' : ''} added</span>
        )}
      </div>

      {open && (
        <form className="cf-inline-form panel" onSubmit={submit}>
          <div className="cf-inline-grid">
            <label className="cf-label">
              Topic
              <select className="cf-select" value={topicId} onChange={e => setTopicId(e.target.value)} required>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.system})</option>
                ))}
              </select>
            </label>
            <label className="cf-label">
              Front (prompt)
              <textarea
                className="cf-textarea"
                rows={3}
                value={front}
                onChange={e => setFront(e.target.value)}
                placeholder="What is the first-line treatment for…"
                required
                autoFocus
              />
            </label>
            <label className="cf-label">
              Back (answer)
              <textarea
                className="cf-textarea"
                rows={3}
                value={back}
                onChange={e => setBack(e.target.value)}
                placeholder="The answer is…"
                required
              />
            </label>
            <label className="cf-label">
              Note <span className="cf-optional">(optional)</span>
              <textarea
                className="cf-textarea"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Extra context or mnemonic…"
              />
            </label>
          </div>
          {error && <p className="cf-error">{error}</p>}
          <div className="cf-inline-footer">
            <button type="submit" className="btn primary" disabled={saving || !front.trim() || !back.trim()}>
              {saving ? 'Saving…' : 'Add flashcard'}
            </button>
            {added > 0 && (
              <span className="cf-added-count">{added} card{added !== 1 ? 's' : ''} added this session</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
