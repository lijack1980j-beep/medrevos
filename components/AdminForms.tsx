'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Topic = {
  id: string; title: string; slug: string; system: string;
  summary: string; difficulty: number; estMinutes: number; highYield: boolean;
};
type FormStatus = { ok: boolean; message: string } | null;

export function AdminForms({ topics, activeForm, onSaved }: {
  topics: Topic[];
  activeForm?: 'topic' | 'lesson' | 'flashcard' | 'question' | 'case';
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [topicStatus,    setTopicStatus]    = useState<FormStatus>(null);
  const [lessonStatus,   setLessonStatus]   = useState<FormStatus>(null);
  const [cardStatus,     setCardStatus]     = useState<FormStatus>(null);
  const [questionStatus, setQuestionStatus] = useState<FormStatus>(null);
  const [caseStatus,     setCaseStatus]     = useState<FormStatus>(null);
  const [opStatus,       setOpStatus]       = useState<FormStatus>(null);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [editStatus,     setEditStatus]     = useState<FormStatus>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [topicSearch,    setTopicSearch]    = useState('');

  const setters: Record<string, (s: FormStatus) => void> = {
    topic: setTopicStatus, lesson: setLessonStatus,
    flashcard: setCardStatus, question: setQuestionStatus, case: setCaseStatus,
  };

  async function submitForm(event: React.FormEvent<HTMLFormElement>, kind: string) {
    event.preventDefault();
    const setter = setters[kind];
    setter(null);
    const form = new FormData(event.currentTarget);
    const payload = { kind, ...Object.fromEntries(form.entries()) };
    const response = await fetch('/api/admin/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await response.json();
    const msg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Saved.');
    setter({ ok: response.ok, message: msg });
    if (response.ok) { event.currentTarget.reset(); router.refresh(); onSaved?.(); }
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setEditStatus(null);
    const form = new FormData(event.currentTarget);
    const entries = Object.fromEntries(form.entries());
    const payload = { id, ...entries, highYield: entries.highYield === 'on' };
    const response = await fetch('/api/admin/content', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await response.json();
    const msg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Updated.');
    setEditStatus({ ok: response.ok, message: msg });
    if (response.ok) { setEditingId(null); router.refresh(); onSaved?.(); }
  }

  async function deleteTopic(topicId: string) {
    setOpStatus(null);
    const response = await fetch('/api/admin/content', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'topic', id: topicId }),
    });
    const data = await response.json();
    setOpStatus({ ok: response.ok, message: data.message || 'Deleted.' });
    setConfirmDeleteId(null);
    if (response.ok) { if (editingId === topicId) setEditingId(null); router.refresh(); onSaved?.(); }
  }

  async function reseed() {
    setOpStatus(null);
    const response = await fetch('/api/admin/seed', { method: 'POST' });
    const data = await response.json();
    setOpStatus({ ok: response.ok, message: data.message });
    if (response.ok) { router.refresh(); onSaved?.(); }
  }

  const show = (kind: 'topic' | 'lesson' | 'flashcard' | 'question' | 'case') =>
    !activeForm || activeForm === kind;

  // When activeForm is set, only one form shows — use full width instead of half-grid
  const gridClass = activeForm ? '' : 'grid cols-2';

  const filteredTopics = topics.filter(t =>
    !topicSearch ||
    t.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
    t.system.toLowerCase().includes(topicSearch.toLowerCase())
  );

  return (
    <div className="admin-forms-wrap">
      <div className={gridClass}>
        {show('topic') && (
          <form className="panel" onSubmit={(e) => submitForm(e, 'topic')}>
            <h3>Create topic</h3>
            <div className="list">
              <label>Title<input name="title" required /></label>
              <label>Slug<input name="slug" required /></label>
              <label>System<input name="system" required /></label>
              <label>Summary<textarea name="summary" rows={3} /></label>
              <label>Difficulty (1–5)<input type="number" name="difficulty" min="1" max="5" defaultValue="3" required /></label>
              <label>Est. minutes<input type="number" name="estMinutes" min="1" max="300" defaultValue="20" required /></label>
              <label className="admin-checkbox-label">
                <input type="checkbox" name="highYield" />
                High Yield
              </label>
            </div>
            <button type="submit" className="btn primary admin-form-btn">Create topic</button>
            {topicStatus && (
              <p className={`admin-form-status${topicStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
                {topicStatus.message}
              </p>
            )}
          </form>
        )}

        {show('lesson') && (
          <form className="panel" onSubmit={(e) => submitForm(e, 'lesson')}>
            <h3>Create lesson</h3>
            {topics.length === 0 ? (
              <p className="muted">No topics available. Create a topic first.</p>
            ) : (
              <div className="list">
                <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
                <label>Title<input name="title" required /></label>
                <label>Content<textarea name="content" rows={5} required /></label>
                <label>Pearls<textarea name="pearls" rows={3} /></label>
                <label>Pitfalls<textarea name="pitfalls" rows={3} /></label>
                <button type="submit" className="btn primary admin-form-btn">Save lesson</button>
                {lessonStatus && (
                  <p className={`admin-form-status${lessonStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
                    {lessonStatus.message}
                  </p>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      <div className={gridClass}>
        {show('flashcard') && (
          <form className="panel" onSubmit={(e) => submitForm(e, 'flashcard')}>
            <h3>Create flashcard</h3>
            {topics.length === 0 ? (
              <p className="muted">No topics available. Create a topic first.</p>
            ) : (
              <div className="list">
                <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
                <label>Front<textarea name="front" rows={3} required /></label>
                <label>Back<textarea name="back" rows={3} required /></label>
                <label>Note<textarea name="note" rows={2} /></label>
                <button type="submit" className="btn primary admin-form-btn">Save flashcard</button>
                {cardStatus && (
                  <p className={`admin-form-status${cardStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
                    {cardStatus.message}
                  </p>
                )}
              </div>
            )}
          </form>
        )}

        {show('question') && (
          <form className="panel" onSubmit={(e) => submitForm(e, 'question')}>
            <h3>Create question</h3>
            {topics.length === 0 ? (
              <p className="muted">No topics available. Create a topic first.</p>
            ) : (
              <div className="list">
                <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
                <label>Stem<textarea name="stem" rows={4} required /></label>
                <label>Explanation<textarea name="explanation" rows={3} required /></label>
                <label>Difficulty (1–5)<input type="number" name="difficulty" min="1" max="5" defaultValue="3" required /></label>
                <label>Option A<input name="optionA" required /></label>
                <label>Option B<input name="optionB" required /></label>
                <label>Option C<input name="optionC" required /></label>
                <label>Option D<input name="optionD" required /></label>
                <label>Correct answer<select name="correctLabel" defaultValue="A"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
                <button type="submit" className="btn primary admin-form-btn">Save question</button>
                {questionStatus && (
                  <p className={`admin-form-status${questionStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
                    {questionStatus.message}
                  </p>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      {show('case') && (
        <div className={gridClass}>
          <form className="panel" onSubmit={(e) => submitForm(e, 'case')}>
            <h3>Create case</h3>
            {topics.length === 0 ? (
              <p className="muted">No topics available. Create a topic first.</p>
            ) : (
              <div className="list">
                <label>Topic<select name="topicId" required>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
                <label>Title<input name="title" required /></label>
                <label>Chief complaint<textarea name="chiefComplaint" rows={3} required /></label>
                <label>Findings<textarea name="findings" rows={4} required /></label>
                <label>Investigations<textarea name="investigations" rows={4} required /></label>
                <label>Diagnosis<textarea name="diagnosis" rows={3} required /></label>
                <label>Management<textarea name="management" rows={4} required /></label>
                <button type="submit" className="btn primary admin-form-btn">Save case</button>
                {caseStatus && (
                  <p className={`admin-form-status${caseStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
                    {caseStatus.message}
                  </p>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── Topic management list (Topics panel only) ── */}
      {show('topic') && (
        <div className="panel">
          <div className="admin-control-header">
            <h3>Manage topics <span className="admin-topic-count">({filteredTopics.length})</span></h3>
            <div className="admin-topic-toolbar">
              <input
                type="search"
                placeholder="Search topics…"
                value={topicSearch}
                onChange={e => setTopicSearch(e.target.value)}
                className="admin-topic-search"
              />
              <button type="button" className="btn secondary" onClick={reseed}>↺ Reseed demo</button>
            </div>
          </div>

          {opStatus && (
            <p className={`admin-form-status${opStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
              {opStatus.message}
            </p>
          )}

          {topics.length === 0 ? (
            <p className="muted">No global topics yet. Create one above.</p>
          ) : filteredTopics.length === 0 ? (
            <p className="muted">No topics match your search.</p>
          ) : (
            <div className="admin-topic-list">
              {filteredTopics.map(topic => (
                <div key={topic.id} className="admin-topic-entry">
                  <div className="admin-topic-row">
                    <div className="admin-topic-info">
                      <span className="admin-topic-name">{topic.title}</span>
                      <span className="admin-topic-meta">
                        {topic.system} · Diff {topic.difficulty}/5 · {topic.estMinutes} min
                        {topic.highYield && <span className="badge badge--warn admin-hy-badge">High Yield</span>}
                      </span>
                    </div>
                    <div className="admin-topic-actions">
                      <button
                        type="button"
                        className={`btn${editingId === topic.id ? ' secondary' : ''}`}
                        onClick={() => {
                          setEditingId(editingId === topic.id ? null : topic.id);
                          setEditStatus(null);
                          setConfirmDeleteId(null);
                        }}
                      >
                        {editingId === topic.id ? 'Cancel' : 'Edit'}
                      </button>
                      {confirmDeleteId === topic.id ? (
                        <>
                          <button type="button" className="btn btn--danger" onClick={() => deleteTopic(topic.id)}>
                            Confirm delete
                          </button>
                          <button type="button" className="btn secondary" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() => { setConfirmDeleteId(topic.id); setEditingId(null); }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {editingId === topic.id && (
                    <form className="admin-edit-form" onSubmit={(e) => submitEdit(e, topic.id)}>
                      <div className="admin-edit-grid">
                        <label>Title<input name="title" defaultValue={topic.title} required /></label>
                        <label>Slug<input name="slug" defaultValue={topic.slug} required /></label>
                        <label>System<input name="system" defaultValue={topic.system} required /></label>
                        <label>Difficulty (1–5)<input type="number" name="difficulty" min="1" max="5" defaultValue={topic.difficulty} required /></label>
                        <label>Est. minutes<input type="number" name="estMinutes" min="1" max="300" defaultValue={topic.estMinutes} required /></label>
                        <label className="admin-checkbox-label">
                          <input type="checkbox" name="highYield" defaultChecked={topic.highYield} />
                          High Yield
                        </label>
                      </div>
                      <label>Summary<textarea name="summary" rows={3} defaultValue={topic.summary} /></label>
                      <div className="admin-edit-footer">
                        <button type="submit" className="btn primary">Save changes</button>
                        {editStatus && (
                          <p className={`admin-form-status${editStatus.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
                            {editStatus.message}
                          </p>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
