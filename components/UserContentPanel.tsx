'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type MainTab     = 'content' | 'exam' | 'calendar';
type ContentTab  = 'lesson' | 'question' | 'flashcard' | 'case';

type UserTopic = {
  id: string; title: string; slug: string; system: string;
  difficulty: number; estMinutes: number;
  _count: { lessons: number; questions: number; flashcards: number; cases: number };
};
type ExamSession = {
  id: string; startedAt: string; finishedAt: string | null;
  status: string; timeLimitSec: number; totalCount: number; correctCount: number;
};
type CalEvent = { id: string; type: string; title: string; dateStr: string; note: string | null };
type ContentItem = { id: string; title?: string; stem?: string; front?: string; chiefComplaint?: string };

const CONTENT_TABS: ContentTab[] = ['lesson', 'question', 'flashcard', 'case'];
const CONTENT_LABELS: Record<ContentTab, string> = { lesson: 'Lessons', question: 'Questions', flashcard: 'Flashcards', case: 'Cases' };

export function UserContentPanel({
  userId, userName, onBack,
}: { userId: string; userName: string; onBack: () => void }) {
  const router = useRouter();
  const [mainTab,   setMainTab]   = useState<MainTab>('content');
  const [topics,    setTopics]    = useState<UserTopic[]>([]);
  const [exams,     setExams]     = useState<ExamSession[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [expandedTopic,   setExpandedTopic]   = useState<string | null>(null);
  const [contentTab,      setContentTab]      = useState<ContentTab>('lesson');
  const [contentItems,    setContentItems]    = useState<ContentItem[]>([]);
  const [contentLoading,  setContentLoading]  = useState(false);

  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Load user data ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/users/${userId}/content`);
    const data = await res.json();
    setTopics(data.topics ?? []);
    setExams(data.examSessions ?? []);
    setCalEvents(data.calEvents ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // ── Load content items for expanded topic / tab ───────────────────────────
  const loadContent = useCallback(async () => {
    if (!expandedTopic) return;
    setContentLoading(true);
    setContentItems([]);
    const res  = await fetch(`/api/admin/content?type=${contentTab}&topicId=${expandedTopic}`);
    const data = await res.json();
    setContentItems(data.items ?? []);
    setContentLoading(false);
  }, [expandedTopic, contentTab]);

  useEffect(() => { loadContent(); }, [loadContent]);

  function toggleTopic(id: string) {
    if (expandedTopic === id) { setExpandedTopic(null); }
    else { setExpandedTopic(id); setContentTab('lesson'); setShowAddContent(false); }
  }

  // ── Topic CRUD ────────────────────────────────────────────────────────────
  async function handleCreateTopic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd   = new FormData(e.currentTarget);
    const body = { kind: 'topic', ...Object.fromEntries(fd.entries()) };
    const res  = await fetch(`/api/admin/users/${userId}/content`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setStatus({ ok: res.ok, msg: data.message ?? 'Done.' });
    if (res.ok) { (e.target as HTMLFormElement).reset(); setShowAddTopic(false); load(); router.refresh(); }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!confirm('Delete this topic and all its content? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/users/${userId}/content`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'topic', id: topicId }),
    });
    const data = await res.json();
    setStatus({ ok: res.ok, msg: data.message ?? 'Deleted.' });
    if (res.ok) { if (expandedTopic === topicId) setExpandedTopic(null); load(); router.refresh(); }
  }

  // ── Content item CRUD ─────────────────────────────────────────────────────
  async function handleCreateContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd   = new FormData(e.currentTarget);
    const body = { kind: contentTab, topicId: expandedTopic!, ...Object.fromEntries(fd.entries()) };
    const res  = await fetch('/api/admin/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setStatus({ ok: res.ok, msg: data.message ?? 'Done.' });
    if (res.ok) { (e.target as HTMLFormElement).reset(); setShowAddContent(false); loadContent(); load(); router.refresh(); }
  }

  async function handleDeleteContent(id: string) {
    const res = await fetch('/api/admin/content', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: contentTab, id }),
    });
    if (res.ok) { loadContent(); load(); router.refresh(); }
  }

  // ── Exam + Calendar CRUD ──────────────────────────────────────────────────
  async function handleDeleteExam(id: string) {
    if (!confirm('Delete this exam session?')) return;
    const res = await fetch(`/api/admin/users/${userId}/content`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'exam', id }),
    });
    if (res.ok) load();
  }

  async function handleDeleteCalEvent(id: string) {
    const res = await fetch(`/api/admin/users/${userId}/content`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'calendar', id }),
    });
    if (res.ok) load();
  }

  // ── Add content forms ─────────────────────────────────────────────────────
  function renderAddContentForm() {
    const btnLabel = `Add ${CONTENT_LABELS[contentTab].slice(0, -1).toLowerCase()}`;
    if (contentTab === 'lesson') return (
      <form className="uc-add-form" onSubmit={handleCreateContent}>
        <label>Title<input name="title" required /></label>
        <label>Content<textarea name="content" rows={3} required /></label>
        <label>Pearls<textarea name="pearls" rows={2} required /></label>
        <label>Pitfalls<textarea name="pitfalls" rows={2} required /></label>
        <button type="submit" className="btn primary">{btnLabel}</button>
      </form>
    );
    if (contentTab === 'flashcard') return (
      <form className="uc-add-form" onSubmit={handleCreateContent}>
        <label>Front<textarea name="front" rows={2} required /></label>
        <label>Back<textarea name="back" rows={2} required /></label>
        <label>Note (optional)<input name="note" /></label>
        <button type="submit" className="btn primary">{btnLabel}</button>
      </form>
    );
    if (contentTab === 'question') return (
      <form className="uc-add-form" onSubmit={handleCreateContent}>
        <label>Stem<textarea name="stem" rows={3} required /></label>
        <label>Explanation<textarea name="explanation" rows={2} required /></label>
        <div className="uc-add-grid">
          <label>Difficulty<input type="number" name="difficulty" min="1" max="5" defaultValue="3" required /></label>
          <label>Option A<input name="optionA" required /></label>
          <label>Option B<input name="optionB" required /></label>
          <label>Option C<input name="optionC" required /></label>
          <label>Option D<input name="optionD" required /></label>
          <label>Correct<select name="correctLabel"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
        </div>
        <button type="submit" className="btn primary">{btnLabel}</button>
      </form>
    );
    if (contentTab === 'case') return (
      <form className="uc-add-form" onSubmit={handleCreateContent}>
        <label>Title<input name="title" required /></label>
        <label>Chief complaint<textarea name="chiefComplaint" rows={2} required /></label>
        <label>Findings<textarea name="findings" rows={2} required /></label>
        <label>Investigations<textarea name="investigations" rows={2} required /></label>
        <label>Diagnosis<textarea name="diagnosis" rows={2} required /></label>
        <label>Management<textarea name="management" rows={2} required /></label>
        <button type="submit" className="btn primary">{btnLabel}</button>
      </form>
    );
    return null;
  }

  function getItemLabel(item: ContentItem) {
    if (contentTab === 'lesson' || contentTab === 'case') return (item.title ?? 'Untitled').slice(0, 80);
    if (contentTab === 'question') return (item.stem ?? '').slice(0, 90) + ((item.stem?.length ?? 0) > 90 ? '…' : '');
    if (contentTab === 'flashcard') return (item.front ?? '').slice(0, 70) + ((item.front?.length ?? 0) > 70 ? '…' : '');
    return item.id;
  }

  // ── Topic count helper ────────────────────────────────────────────────────
  function topicCount(t: UserTopic, ct: ContentTab) {
    if (ct === 'lesson')    return t._count.lessons;
    if (ct === 'question')  return t._count.questions;
    if (ct === 'flashcard') return t._count.flashcards;
    if (ct === 'case')      return t._count.cases;
    return 0;
  }

  return (
    <div className="uc-panel">

      {/* ── Header ── */}
      <div className="uc-panel-header">
        <button type="button" className="btn secondary" onClick={onBack}>← Back to Users</button>
        <div>
          <div className="kicker">Per-user content</div>
          <h2>{userName}</h2>
        </div>
      </div>

      {/* ── Main tabs ── */}
      <div className="uc-maintabs">
        {(['content', 'exam', 'calendar'] as MainTab[]).map(t => (
          <button key={t} type="button"
            className={`uc-maintab${mainTab === t ? ' uc-maintab--active' : ''}`}
            onClick={() => setMainTab(t)}
          >
            {t === 'content' ? '📚 Content' : t === 'exam' ? '🎯 Exam History' : '📅 Calendar'}
          </button>
        ))}
      </div>

      {status && (
        <p className={`admin-form-status${status.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
          {status.msg}
        </p>
      )}

      {loading ? <div className="adm-loading">Loading…</div> : (
        <>
          {/* ══ Content tab ══ */}
          {mainTab === 'content' && (
            <div className="uc-section">
              <div className="uc-section-hdr">
                <h3>Topics <span className="muted">({topics.length})</span></h3>
                <button type="button"
                  className={`btn${showAddTopic ? ' secondary' : ' primary'}`}
                  onClick={() => setShowAddTopic(v => !v)}
                >
                  {showAddTopic ? 'Cancel' : '+ New topic'}
                </button>
              </div>

              {showAddTopic && (
                <form className="panel uc-add-topic-form" onSubmit={handleCreateTopic}>
                  <h4>New topic for {userName}</h4>
                  <div className="uc-add-grid">
                    <label>Title<input name="title" required /></label>
                    <label>Slug<input name="slug" required /></label>
                    <label>System<input name="system" required /></label>
                    <label>Summary<textarea name="summary" rows={2} /></label>
                    <label>Difficulty (1–5)<input type="number" name="difficulty" min="1" max="5" defaultValue="3" required /></label>
                    <label>Est. minutes<input type="number" name="estMinutes" min="5" max="300" defaultValue="20" required /></label>
                  </div>
                  <button type="submit" className="btn primary">Create topic</button>
                </form>
              )}

              {topics.length === 0
                ? <p className="muted">No topics assigned to this user. Create one above.</p>
                : (
                  <div className="uc-topic-list">
                    {topics.map(topic => {
                      const isExp = expandedTopic === topic.id;
                      return (
                        <div key={topic.id} className={`uc-topic-card${isExp ? ' uc-topic-card--open' : ''}`}>
                          <div className="uc-topic-row">
                            <div className="uc-topic-meta">
                              <span className="uc-topic-title">{topic.title}</span>
                              <span className="badge">{topic.system}</span>
                              <span className="muted uc-topic-counts">
                                {topic._count.lessons}L · {topic._count.questions}Q · {topic._count.flashcards}FC · {topic._count.cases} cases
                              </span>
                            </div>
                            <div className="uc-topic-btns">
                              <button type="button" className={`btn${isExp ? ' secondary' : ''}`} onClick={() => toggleTopic(topic.id)}>
                                {isExp ? 'Collapse' : 'Manage'}
                              </button>
                              <button type="button" className="btn btn--danger" onClick={() => handleDeleteTopic(topic.id)}>Delete</button>
                            </div>
                          </div>

                          {isExp && (
                            <div className="uc-topic-body">
                              {/* Content sub-tabs */}
                              <div className="uc-ctabs">
                                {CONTENT_TABS.map(ct => (
                                  <button key={ct} type="button"
                                    className={`uc-ctab${contentTab === ct ? ' uc-ctab--active' : ''}`}
                                    onClick={() => { setContentTab(ct); setShowAddContent(false); }}
                                  >
                                    {CONTENT_LABELS[ct]}
                                    <span className="uc-ctab-count">{topicCount(topic, ct)}</span>
                                  </button>
                                ))}
                              </div>

                              <div className="uc-ctab-toolbar">
                                <button type="button" className={`btn${showAddContent ? ' secondary' : ''}`} onClick={() => setShowAddContent(v => !v)}>
                                  {showAddContent ? 'Cancel' : `+ Add ${CONTENT_LABELS[contentTab].slice(0, -1).toLowerCase()}`}
                                </button>
                              </div>

                              {showAddContent && renderAddContentForm()}

                              {contentLoading
                                ? <div className="adm-loading">Loading…</div>
                                : contentItems.length === 0
                                  ? <p className="muted uc-empty-items">No {CONTENT_LABELS[contentTab].toLowerCase()} yet.</p>
                                  : (
                                    <div className="uc-item-list">
                                      {contentItems.map(item => (
                                        <div key={item.id} className="uc-item-row">
                                          <span className="uc-item-label">{getItemLabel(item)}</span>
                                          <button type="button" className="btn btn--danger" onClick={() => handleDeleteContent(item.id)}>Delete</button>
                                        </div>
                                      ))}
                                    </div>
                                  )
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ══ Exam History tab ══ */}
          {mainTab === 'exam' && (
            <div className="uc-section">
              <h3>Exam sessions <span className="muted">({exams.length})</span></h3>
              {exams.length === 0
                ? <p className="muted">No exam sessions yet.</p>
                : (
                  <div className="uc-data-list">
                    {exams.map(s => {
                      const score = s.totalCount > 0 ? Math.round((s.correctCount / s.totalCount) * 100) : 0;
                      const dur   = s.finishedAt
                        ? Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
                        : Math.round(s.timeLimitSec / 60);
                      return (
                        <div key={s.id} className="uc-data-row">
                          <div className="uc-data-info">
                            <span className={`badge${s.status === 'COMPLETED' ? '' : ' badge--warn'}`}>{s.status}</span>
                            <span>{new Date(s.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="muted">{s.totalCount} Qs · {dur}m · {score}%</span>
                          </div>
                          <button type="button" className="btn btn--danger" onClick={() => handleDeleteExam(s.id)}>Delete</button>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ══ Calendar tab ══ */}
          {mainTab === 'calendar' && (
            <div className="uc-section">
              <h3>Calendar events <span className="muted">({calEvents.length})</span></h3>
              {calEvents.length === 0
                ? <p className="muted">No calendar events yet.</p>
                : (
                  <div className="uc-data-list">
                    {calEvents.map(e => (
                      <div key={e.id} className="uc-data-row">
                        <div className="uc-data-info">
                          <span className="badge">{e.type}</span>
                          <span>{e.title}</span>
                          <span className="muted">{e.dateStr}</span>
                          {e.note && <span className="muted">· {e.note.slice(0, 50)}</span>}
                        </div>
                        <button type="button" className="btn btn--danger" onClick={() => handleDeleteCalEvent(e.id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
