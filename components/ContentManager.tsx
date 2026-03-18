'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type CMType = 'lesson' | 'question' | 'flashcard' | 'case';

interface BaseItem { id: string; topicId: string; topicTitle: string; createdAt: string }
interface LessonItem    extends BaseItem { title: string; content: string; pearls: string; pitfalls: string }
interface QuestionItem  extends BaseItem { stem: string; explanation: string; difficulty: number; correctOptionId: string | null; options: { id: string; label: string; text: string; isCorrect: boolean }[] }
interface FlashcardItem extends BaseItem { front: string; back: string; note: string | null }
interface CaseItem      extends BaseItem { title: string; chiefComplaint: string; findings: string; investigations: string; diagnosis: string; management: string }

type AnyItem = LessonItem | QuestionItem | FlashcardItem | CaseItem;

type Status = { ok: boolean; msg: string } | null;

const LABELS: Record<CMType, string> = { lesson: 'Lessons', question: 'Questions', flashcard: 'Flashcards', case: 'Cases' };

export function ContentManager({ type }: { type: CMType }) {
  const router = useRouter();
  const [items, setItems]         = useState<AnyItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [status, setStatus]       = useState<Status>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/content?type=${type}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setStatus(null);
    const res  = await fetch('/api/admin/content', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: type, id }) });
    const data = await res.json();
    setStatus({ ok: res.ok, msg: data.message ?? 'Deleted.' });
    if (res.ok) { setConfirmId(null); load(); router.refresh(); }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setStatus(null);
    const form    = new FormData(e.currentTarget);
    const entries = Object.fromEntries(form.entries());
    const payload = { kind: type, id, ...entries };
    const res     = await fetch('/api/admin/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data    = await res.json();
    setStatus({ ok: res.ok, msg: data.message ?? 'Updated.' });
    if (res.ok) { setEditingId(null); load(); router.refresh(); }
  }

  const filtered = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    const base = item.topicTitle.toLowerCase();
    if (type === 'lesson' || type === 'case') return base.includes(s) || (item as LessonItem | CaseItem).title.toLowerCase().includes(s);
    if (type === 'question')  return base.includes(s) || (item as QuestionItem).stem.toLowerCase().includes(s);
    if (type === 'flashcard') return base.includes(s) || (item as FlashcardItem).front.toLowerCase().includes(s) || (item as FlashcardItem).back.toLowerCase().includes(s);
    return true;
  });

  function renderSummary(item: AnyItem) {
    if (type === 'lesson')    return <span className="cm-item-title">{(item as LessonItem).title}</span>;
    if (type === 'case')      return <span className="cm-item-title">{(item as CaseItem).title}</span>;
    if (type === 'question')  { const q = item as QuestionItem; return <span className="cm-item-title">{q.stem.slice(0, 90)}{q.stem.length > 90 ? '…' : ''}</span>; }
    if (type === 'flashcard') { const f = item as FlashcardItem; return <span className="cm-item-title">{f.front.slice(0, 70)}{f.front.length > 70 ? '…' : ''}</span>; }
    return null;
  }

  function renderEditForm(item: AnyItem) {
    if (type === 'lesson') {
      const l = item as LessonItem;
      return (
        <form className="cm-edit-form" onSubmit={e => handleEdit(e, item.id)}>
          <label>Title<input name="title" defaultValue={l.title} required /></label>
          <label>Content<textarea name="content" rows={5} defaultValue={l.content} required /></label>
          <label>Pearls<textarea name="pearls" rows={3} defaultValue={l.pearls} required /></label>
          <label>Pitfalls<textarea name="pitfalls" rows={3} defaultValue={l.pitfalls} required /></label>
          <div className="cm-edit-footer"><button type="submit" className="btn primary">Save</button></div>
        </form>
      );
    }
    if (type === 'question') {
      const q = item as QuestionItem;
      const optMap: Record<string, string> = {};
      for (const o of q.options) optMap[o.label] = o.text;
      const correctLabel = q.options.find(o => o.isCorrect)?.label ?? 'A';
      return (
        <form className="cm-edit-form" onSubmit={e => handleEdit(e, item.id)}>
          <label>Stem<textarea name="stem" rows={4} defaultValue={q.stem} required /></label>
          <label>Explanation<textarea name="explanation" rows={3} defaultValue={q.explanation} required /></label>
          <div className="cm-edit-grid">
            <label>Difficulty (1–5)<input type="number" name="difficulty" min="1" max="5" defaultValue={q.difficulty} required /></label>
            <label>Option A<input name="optionA" defaultValue={optMap['A']} required /></label>
            <label>Option B<input name="optionB" defaultValue={optMap['B']} required /></label>
            <label>Option C<input name="optionC" defaultValue={optMap['C']} required /></label>
            <label>Option D<input name="optionD" defaultValue={optMap['D']} required /></label>
            <label>Correct answer<select name="correctLabel" defaultValue={correctLabel}><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
          </div>
          <div className="cm-edit-footer"><button type="submit" className="btn primary">Save</button></div>
        </form>
      );
    }
    if (type === 'flashcard') {
      const f = item as FlashcardItem;
      return (
        <form className="cm-edit-form" onSubmit={e => handleEdit(e, item.id)}>
          <label>Front<textarea name="front" rows={3} defaultValue={f.front} required /></label>
          <label>Back<textarea name="back" rows={3} defaultValue={f.back} required /></label>
          <label>Note<textarea name="note" rows={2} defaultValue={f.note ?? ''} /></label>
          <div className="cm-edit-footer"><button type="submit" className="btn primary">Save</button></div>
        </form>
      );
    }
    if (type === 'case') {
      const c = item as CaseItem;
      return (
        <form className="cm-edit-form" onSubmit={e => handleEdit(e, item.id)}>
          <label>Title<input name="title" defaultValue={c.title} required /></label>
          <label>Chief complaint<textarea name="chiefComplaint" rows={3} defaultValue={c.chiefComplaint} required /></label>
          <label>Findings<textarea name="findings" rows={4} defaultValue={c.findings} required /></label>
          <label>Investigations<textarea name="investigations" rows={4} defaultValue={c.investigations} required /></label>
          <label>Diagnosis<textarea name="diagnosis" rows={3} defaultValue={c.diagnosis} required /></label>
          <label>Management<textarea name="management" rows={4} defaultValue={c.management} required /></label>
          <div className="cm-edit-footer"><button type="submit" className="btn primary">Save</button></div>
        </form>
      );
    }
    return null;
  }

  return (
    <div className="cm-wrap panel">
      <div className="cm-header">
        <h3>{LABELS[type]} <span className="muted">({filtered.length})</span></h3>
        <div className="cm-toolbar">
          <input
            type="search"
            placeholder={`Search ${LABELS[type].toLowerCase()}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cm-search"
          />
          <button type="button" className="btn secondary" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {status && (
        <p className={`admin-form-status${status.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
          {status.msg}
        </p>
      )}

      {loading ? (
        <div className="adm-loading">Loading {LABELS[type].toLowerCase()}…</div>
      ) : filtered.length === 0 ? (
        <p className="muted">No {LABELS[type].toLowerCase()} found.</p>
      ) : (
        <div className="cm-list">
          {filtered.map(item => {
            const isEditing = editingId === item.id;
            const isConfirm = confirmId === item.id;
            return (
              <div key={item.id} className="cm-item">
                <div className="cm-item-header">
                  <div className="cm-item-info">
                    <span className="badge">{item.topicTitle}</span>
                    {renderSummary(item)}
                  </div>
                  <div className="cm-item-actions">
                    <button
                      type="button"
                      className={`btn${isEditing ? ' secondary' : ''}`}
                      onClick={() => { setEditingId(isEditing ? null : item.id); setStatus(null); setConfirmId(null); }}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    {!isConfirm ? (
                      <button type="button" className="btn btn--danger" onClick={() => { setConfirmId(item.id); setEditingId(null); }}>Delete</button>
                    ) : (
                      <>
                        <button type="button" className="btn btn--danger" onClick={() => handleDelete(item.id)}>Confirm delete</button>
                        <button type="button" className="btn secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing && renderEditForm(item)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
