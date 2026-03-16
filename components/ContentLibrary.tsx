'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = { id: string; label: string; text: string; isCorrect: boolean };
type Question = { id: string; stem: string; explanation: string; difficulty: number; correctOptionId: string | null; options: Option[] };
type Flashcard = { id: string; front: string; back: string; note: string | null };
type TopicWithContent = {
  id: string; title: string; system: string;
  flashcards: Flashcard[];
  questions: Question[];
};

type FormStatus = { ok: boolean; message: string } | null;

function FlashcardRow({ card }: { card: Flashcard }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'flashcard', id: card.id, ...Object.fromEntries(form.entries()) }),
    });
    const data = await res.json();
    setStatus({ ok: res.ok, message: data.message || (res.ok ? 'Saved.' : 'Error.') });
    if (res.ok) { setEditing(false); router.refresh(); }
  }

  async function remove() {
    if (!confirm('Delete this flashcard?')) return;
    const res = await fetch('/api/admin/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'flashcard', id: card.id }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="cl-item">
      <div className="cl-item-row">
        <div className="cl-item-preview">
          <span className="cl-item-front">{card.front}</span>
          <span className="cl-item-sep">→</span>
          <span className="cl-item-back muted">{card.back}</span>
        </div>
        <div className="cl-item-actions">
          <button type="button" className="btn cl-btn-sm" onClick={() => { setEditing(v => !v); setStatus(null); }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button type="button" className="btn btn--danger cl-btn-sm" onClick={remove}>Delete</button>
        </div>
      </div>

      {editing && (
        <form className="cl-edit-form" onSubmit={save}>
          <label>Front<textarea name="front" rows={2} defaultValue={card.front} required /></label>
          <label>Back<textarea name="back" rows={2} defaultValue={card.back} required /></label>
          <label>Note (optional)<input name="note" defaultValue={card.note ?? ''} /></label>
          <div className="cl-edit-footer">
            <button type="submit" className="btn primary">Save changes</button>
            {status && <p className={`admin-form-status${status.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{status.message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}

function QuestionRow({ q }: { q: Question }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const optMap: Record<string, string> = {};
  for (const o of q.options) optMap[o.label] = o.text;
  const correctLabel = q.options.find(o => o.isCorrect)?.label ?? 'A';

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'question', id: q.id, ...Object.fromEntries(form.entries()) }),
    });
    const data = await res.json();
    setStatus({ ok: res.ok, message: data.message || (res.ok ? 'Saved.' : 'Error.') });
    if (res.ok) { setEditing(false); router.refresh(); }
  }

  async function remove() {
    if (!confirm('Delete this question and all its options?')) return;
    const res = await fetch('/api/admin/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'question', id: q.id }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="cl-item">
      <div className="cl-item-row">
        <div className="cl-item-preview">
          <span className="cl-item-front">{q.stem.length > 100 ? q.stem.slice(0, 100) + '…' : q.stem}</span>
          <span className={`badge cl-diff-badge`}>Diff {q.difficulty}/5</span>
        </div>
        <div className="cl-item-actions">
          <button type="button" className="btn cl-btn-sm" onClick={() => { setEditing(v => !v); setStatus(null); }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button type="button" className="btn btn--danger cl-btn-sm" onClick={remove}>Delete</button>
        </div>
      </div>

      {editing && (
        <form className="cl-edit-form" onSubmit={save}>
          <label>Stem<textarea name="stem" rows={4} defaultValue={q.stem} required /></label>
          <label>Explanation<textarea name="explanation" rows={3} defaultValue={q.explanation} required /></label>
          <label>Difficulty
            <input type="number" name="difficulty" min="1" max="5" defaultValue={q.difficulty} required />
          </label>
          <div className="cl-options-grid">
            <label>Option A<input name="optionA" defaultValue={optMap['A'] ?? ''} required /></label>
            <label>Option B<input name="optionB" defaultValue={optMap['B'] ?? ''} required /></label>
            <label>Option C<input name="optionC" defaultValue={optMap['C'] ?? ''} required /></label>
            <label>Option D<input name="optionD" defaultValue={optMap['D'] ?? ''} required /></label>
          </div>
          <label>Correct answer
            <select name="correctLabel" defaultValue={correctLabel}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>
          <div className="cl-edit-footer">
            <button type="submit" className="btn primary">Save changes</button>
            {status && <p className={`admin-form-status${status.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{status.message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}

function TopicSection({ topic, tab }: { topic: TopicWithContent; tab: 'flashcards' | 'questions' }) {
  const [open, setOpen] = useState(false);
  const count = tab === 'flashcards' ? topic.flashcards.length : topic.questions.length;
  if (count === 0) return null;

  return (
    <div className="cl-topic-section">
      <button type="button" className="cl-topic-header" onClick={() => setOpen(v => !v)}>
        <div className="cl-topic-header-left">
          <span className="cl-topic-title">{topic.title}</span>
          <span className="badge">{topic.system}</span>
          <span className="cl-topic-count">{count} {tab === 'flashcards' ? 'card' : 'question'}{count !== 1 ? 's' : ''}</span>
        </div>
        <span className="cl-topic-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="cl-topic-body">
          {tab === 'flashcards'
            ? topic.flashcards.map(card => <FlashcardRow key={card.id} card={card} />)
            : topic.questions.map(q => <QuestionRow key={q.id} q={q} />)
          }
        </div>
      )}
    </div>
  );
}

export function ContentLibrary({ topics }: { topics: TopicWithContent[] }) {
  const [tab, setTab] = useState<'flashcards' | 'questions'>('flashcards');

  const totalCards = topics.reduce((s, t) => s + t.flashcards.length, 0);
  const totalQs    = topics.reduce((s, t) => s + t.questions.length, 0);

  return (
    <div className="panel cl-wrap">
      <div className="cl-header">
        <div>
          <h3>Content library</h3>
          <p className="muted cl-subtitle">Browse, edit, or delete existing content organised by topic.</p>
        </div>
        <div className="cl-tabs">
          <button
            type="button"
            className={`cl-tab${tab === 'flashcards' ? ' cl-tab--active' : ''}`}
            onClick={() => setTab('flashcards')}
          >
            Flashcards <span className="cl-tab-count">{totalCards}</span>
          </button>
          <button
            type="button"
            className={`cl-tab${tab === 'questions' ? ' cl-tab--active' : ''}`}
            onClick={() => setTab('questions')}
          >
            Questions <span className="cl-tab-count">{totalQs}</span>
          </button>
        </div>
      </div>

      <div className="cl-list">
        {topics.map(topic => (
          <TopicSection key={topic.id} topic={topic} tab={tab} />
        ))}
        {(tab === 'flashcards' ? totalCards : totalQs) === 0 && (
          <p className="muted cl-empty">No {tab} yet. Create some using the forms above or the AI generator.</p>
        )}
      </div>
    </div>
  );
}
