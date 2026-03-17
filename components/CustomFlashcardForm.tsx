'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Topic = { id: string; title: string; system: string };

export function CustomFlashcardForm({ topics }: { topics: Topic[] }) {
  const router                        = useRouter();
  const [open, setOpen]               = useState(false);
  const [topicId, setTopicId]         = useState(topics[0]?.id ?? '');
  const [front, setFront]             = useState('');
  const [back, setBack]               = useState('');
  const [note, setNote]               = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

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
      if (!res.ok) throw new Error(await res.text());
      setFront(''); setBack(''); setNote('');
      setSuccess('Card created!');
      setOpen(false);
      router.refresh(); // re-fetch server component data so new card appears
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" className="btn primary cf-create-btn" onClick={() => { setOpen(true); setSuccess(''); }}>
        + Create card
      </button>
      {success && <span className="cf-success">{success}</span>}

      {open && (
        <div className="cf-overlay" onClick={() => setOpen(false)}>
          <div className="cf-modal" onClick={e => e.stopPropagation()}>
            <div className="cf-modal-header">
              <h3>Create custom flashcard</h3>
              <button type="button" className="cf-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <form onSubmit={submit} className="cf-form">
              <label className="cf-label">
                Topic
                <select className="cf-select" value={topicId} onChange={e => setTopicId(e.target.value)}>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.system})</option>
                  ))}
                </select>
              </label>
              <label className="cf-label">
                Front (prompt)
                <textarea className="cf-textarea" rows={3} value={front} onChange={e => setFront(e.target.value)} placeholder="What is the first-line treatment for…" required />
              </label>
              <label className="cf-label">
                Back (answer)
                <textarea className="cf-textarea" rows={3} value={back} onChange={e => setBack(e.target.value)} placeholder="The answer is…" required />
              </label>
              <label className="cf-label">
                Note (optional)
                <textarea className="cf-textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Extra context or mnemonic…" />
              </label>
              {error && <p className="cf-error">{error}</p>}
              <div className="cf-actions">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving || !front.trim() || !back.trim()}>
                  {saving ? 'Saving…' : 'Create card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
