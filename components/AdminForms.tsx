'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Topic = {
  id: string; title: string; slug: string; system: string;
  summary: string; difficulty: number; estMinutes: number; highYield: boolean;
};
type FormStatus = { ok: boolean; message: string } | null;

export function AdminForms({ topics }: { topics: Topic[] }) {
  const router = useRouter();
  const [topicStatus,    setTopicStatus]    = useState<FormStatus>(null);
  const [lessonStatus,   setLessonStatus]   = useState<FormStatus>(null);
  const [cardStatus,     setCardStatus]     = useState<FormStatus>(null);
  const [questionStatus, setQuestionStatus] = useState<FormStatus>(null);
  const [deleteStatus,   setDeleteStatus]   = useState<FormStatus>(null);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [editStatus,     setEditStatus]     = useState<FormStatus>(null);

  const setters: Record<string, (s: FormStatus) => void> = {
    topic: setTopicStatus, lesson: setLessonStatus,
    flashcard: setCardStatus, question: setQuestionStatus,
  };

  async function submitForm(event: React.FormEvent<HTMLFormElement>, kind: string) {
    event.preventDefault();
    const setter = setters[kind];
    setter(null);
    const form = new FormData(event.currentTarget);
    const payload = { kind, ...Object.fromEntries(form.entries()) };
    const response = await fetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    const msg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Saved.');
    setter({ ok: response.ok, message: msg });
    if (response.ok) { event.currentTarget.reset(); router.refresh(); }
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setEditStatus(null);
    const form = new FormData(event.currentTarget);
    const entries = Object.fromEntries(form.entries());
    const payload = { id, ...entries, highYield: entries.highYield === 'on' };
    const response = await fetch('/api/admin/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    const msg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Updated.');
    setEditStatus({ ok: response.ok, message: msg });
    if (response.ok) { setEditingId(null); router.refresh(); }
  }

  async function deleteTopic(topicId: string) {
    setDeleteStatus(null);
    const response = await fetch('/api/admin/content', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'topic', id: topicId }) });
    const data = await response.json();
    setDeleteStatus({ ok: response.ok, message: data.message || 'Deleted.' });
    if (response.ok) router.refresh();
  }

  async function reseed() {
    setDeleteStatus(null);
    const response = await fetch('/api/admin/seed', { method: 'POST' });
    const data = await response.json();
    setDeleteStatus({ ok: response.ok, message: data.message });
    if (response.ok) router.refresh();
  }

  return (
    <div className="admin-forms-wrap">
      <div className="grid cols-2">
        <form className="panel" onSubmit={(e) => submitForm(e, 'topic')}>
          <h3>Create topic</h3>
          <div className="list">
            <label>Title<input name="title" required /></label>
            <label>Slug<input name="slug" required /></label>
            <label>System<input name="system" required /></label>
            <label>Summary<textarea name="summary" rows={4} required /></label>
            <label>Difficulty<input type="number" name="difficulty" min="1" max="5" defaultValue="3" required /></label>
            <label>Estimated minutes<input type="number" name="estMinutes" min="5" max="300" defaultValue="20" required /></label>
            <label className="admin-checkbox-label">
              <input type="checkbox" name="highYield" />
              High Yield
            </label>
          </div>
          <button type="submit" className="btn primary admin-form-btn">Save topic</button>
          {topicStatus && <p className={`admin-form-status${topicStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{topicStatus.message}</p>}
        </form>

        <form className="panel" onSubmit={(e) => submitForm(e, 'lesson')}>
          <h3>Create lesson</h3>
          <div className="list">
            <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <label>Title<input name="title" required /></label>
            <label>Content<textarea name="content" rows={5} required /></label>
            <label>Pearls<textarea name="pearls" rows={3} required /></label>
            <label>Pitfalls<textarea name="pitfalls" rows={3} required /></label>
          </div>
          <button type="submit" className="btn primary admin-form-btn">Save lesson</button>
          {lessonStatus && <p className={`admin-form-status${lessonStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{lessonStatus.message}</p>}
        </form>
      </div>

      <div className="grid cols-2">
        <form className="panel" onSubmit={(e) => submitForm(e, 'flashcard')}>
          <h3>Create flashcard</h3>
          <div className="list">
            <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <label>Front<textarea name="front" rows={3} required /></label>
            <label>Back<textarea name="back" rows={3} required /></label>
            <label>Note<textarea name="note" rows={2} /></label>
          </div>
          <button type="submit" className="btn primary admin-form-btn">Save flashcard</button>
          {cardStatus && <p className={`admin-form-status${cardStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{cardStatus.message}</p>}
        </form>

        <form className="panel" onSubmit={(e) => submitForm(e, 'question')}>
          <h3>Create question</h3>
          <div className="list">
            <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <label>Stem<textarea name="stem" rows={4} required /></label>
            <label>Explanation<textarea name="explanation" rows={3} required /></label>
            <label>Difficulty<input type="number" name="difficulty" min="1" max="5" defaultValue="3" required /></label>
            <label>Option A<input name="optionA" required /></label>
            <label>Option B<input name="optionB" required /></label>
            <label>Option C<input name="optionC" required /></label>
            <label>Option D<input name="optionD" required /></label>
            <label>Correct label<select name="correctLabel" defaultValue="A"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
          </div>
          <button type="submit" className="btn primary admin-form-btn">Save question</button>
          {questionStatus && <p className={`admin-form-status${questionStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{questionStatus.message}</p>}
        </form>
      </div>

      {/* Topic management with inline edit */}
      <div className="panel">
        <div className="admin-control-header">
          <h3>Topic management</h3>
          <button type="button" className="btn secondary" onClick={reseed}>Reseed demo content</button>
        </div>

        <div className="admin-topic-list">
          {topics.map(topic => (
            <div key={topic.id} className="admin-topic-entry">
              <div className="admin-topic-row">
                <div className="admin-topic-info">
                  <span className="admin-topic-name">{topic.title}</span>
                  <span className="admin-topic-meta">{topic.system} · Diff {topic.difficulty}/5 · {topic.estMinutes} min</span>
                </div>
                <div className="admin-topic-actions">
                  <button
                    type="button"
                    className={`btn${editingId === topic.id ? ' secondary' : ''}`}
                    onClick={() => { setEditingId(editingId === topic.id ? null : topic.id); setEditStatus(null); }}
                  >
                    {editingId === topic.id ? 'Cancel' : 'Edit'}
                  </button>
                  <button type="button" className="btn btn--danger" onClick={() => deleteTopic(topic.id)}>Delete</button>
                </div>
              </div>

              {editingId === topic.id && (
                <form className="admin-edit-form" onSubmit={(e) => submitEdit(e, topic.id)}>
                  <div className="admin-edit-grid">
                    <label>Title<input name="title" defaultValue={topic.title} required /></label>
                    <label>Slug<input name="slug" defaultValue={topic.slug} required /></label>
                    <label>System<input name="system" defaultValue={topic.system} required /></label>
                    <label>Difficulty<input type="number" name="difficulty" min="1" max="5" defaultValue={topic.difficulty} required /></label>
                    <label>Est. minutes<input type="number" name="estMinutes" min="5" max="300" defaultValue={topic.estMinutes} required /></label>
                    <label className="admin-checkbox-label">
                      <input type="checkbox" name="highYield" defaultChecked={topic.highYield} />
                      High Yield
                    </label>
                  </div>
                  <label>Summary<textarea name="summary" rows={3} defaultValue={topic.summary} required /></label>
                  <div className="admin-edit-footer">
                    <button type="submit" className="btn primary">Save changes</button>
                    {editStatus && <p className={`admin-form-status${editStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{editStatus.message}</p>}
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>

        {deleteStatus && <p className={`admin-form-status${deleteStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>{deleteStatus.message}</p>}
      </div>
    </div>
  );
}
