'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminForms } from '@/components/AdminForms';
import { ContentLibrary } from '@/components/ContentLibrary';
import { AIGeneratorPanel } from '@/components/AIGeneratorPanel';
import { ContentManager } from '@/components/ContentManager';
import { UserContentPanel } from '@/components/UserContentPanel';
import { SECTIONS } from '@/lib/access';

// ── Types ─────────────────────────────────────────────────────────────────────
type Topic = {
  id: string; title: string; slug: string; system: string;
  summary: string; difficulty: number; estMinutes: number; highYield: boolean;
  flashcards: { id: string; front: string; back: string; note: string | null }[];
  questions: {
    id: string; stem: string; explanation: string; difficulty: number;
    correctOptionId: string | null;
    options: { id: string; label: string; text: string; isCorrect: boolean }[];
  }[];
};
type FlatTopic = Omit<Topic, 'flashcards' | 'questions'>;
type AdminUser = {
  id: string; name: string; email: string; role: string;
  blockedSections: string[]; createdAt: string;
  _count: { attempts: number; reviews: number };
};
type Counts = [number, number, number, number, number];

// ── Sidebar ───────────────────────────────────────────────────────────────────
type PanelId =
  | 'overview' | 'users' | 'user-content'
  | 'topics' | 'lessons' | 'questions' | 'flashcards' | 'cases'
  | 'ai' | 'library';

const SIDEBAR: { id: PanelId; label: string; icon: string; group?: string }[] = [
  { id: 'overview',   label: 'Overview',        icon: '📊' },
  { id: 'users',      label: 'Users',           icon: '👥' },
  { id: 'topics',     label: 'Topics',          icon: '🗂️',  group: 'Content' },
  { id: 'lessons',    label: 'Lessons',         icon: '📖', group: 'Content' },
  { id: 'questions',  label: 'Questions',       icon: '📝', group: 'Content' },
  { id: 'flashcards', label: 'Flashcards',      icon: '🃏', group: 'Content' },
  { id: 'cases',      label: 'Cases',           icon: '🩺', group: 'Content' },
  { id: 'ai',         label: 'AI Generator',    icon: '🤖', group: 'Tools' },
  { id: 'library',    label: 'Content Library', icon: '📚', group: 'Tools' },
];

function sidebarActive(current: PanelId, item: PanelId) {
  if (current === 'user-content') return item === 'users';
  return current === item;
}

// ── Split-pane content panel ──────────────────────────────────────────────────
function SplitPanel({
  kicker, title, description,
  leftLabel, left,
  rightLabel, right,
}: {
  kicker: string; title: string; description: string;
  leftLabel: string; left: React.ReactNode;
  rightLabel: string; right: React.ReactNode;
}) {
  return (
    <div className="adm-panel adm-content-panel">
      <div className="adm-panel-header adm-panel-header--pad">
        <div className="kicker">{kicker}</div>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <div className="adm-split">
        <div className="adm-split-left">
          <h3 className="adm-section-label">{leftLabel}</h3>
          {left}
        </div>
        <div className="adm-split-right">
          <h3 className="adm-section-label">{rightLabel}</h3>
          {right}
        </div>
      </div>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function AdminShell({ topics, flatTopics, counts }: {
  topics: Topic[];
  flatTopics: FlatTopic[];
  counts: Counts;
}) {
  const [panel,            setPanel]            = useState<PanelId>('overview');
  const [collapsed,        setCollapsed]        = useState(false);
  const [contentOpen,      setContentOpen]      = useState(true);
  const [toolsOpen,        setToolsOpen]        = useState(true);
  const [selectedUserId,   setSelectedUserId]   = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [cmRefreshKey,     setCmRefreshKey]     = useState(0);

  function openUserContent(id: string, name: string) {
    setSelectedUserId(id);
    setSelectedUserName(name);
    setPanel('user-content');
  }

  const refresh = () => setCmRefreshKey(k => k + 1);

  return (
    <div className={`adm-shell${collapsed ? ' adm-shell--collapsed' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <button
          type="button"
          className="adm-sidebar-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>

        <nav className="adm-sidebar-nav">
          {(() => {
            const groupState: Record<string, [boolean, () => void]> = {
              'Content': [contentOpen, () => setContentOpen(o => !o)],
              'Tools':   [toolsOpen,   () => setToolsOpen(o => !o)],
            };
            const groupIcons: Record<string, string> = { Content: '📚', Tools: '🔧' };
            const items: React.ReactNode[] = [];
            let lastGroup: string | undefined;

            for (const item of SIDEBAR) {
              if (item.group && item.group !== lastGroup) {
                lastGroup = item.group;
                const [open, toggle] = groupState[item.group] ?? [true, () => {}];
                items.push(
                  <button
                    key={`group-${item.group}`}
                    type="button"
                    className="adm-sidebar-group"
                    onClick={toggle}
                    title={item.group}
                  >
                    <span className="adm-sidebar-group-icon">{groupIcons[item.group] ?? '📁'}</span>
                    {!collapsed && (
                      <>
                        <span className="adm-sidebar-group-label">{item.group}</span>
                        <span className="adm-sidebar-group-chevron">{open ? '▾' : '▸'}</span>
                      </>
                    )}
                  </button>
                );
              }
              const [groupOpen] = item.group ? (groupState[item.group] ?? [true]) : [true];
              if (item.group && !groupOpen) continue;
              items.push(
                <button
                  key={item.id}
                  type="button"
                  className={`adm-sidebar-item${sidebarActive(panel, item.id) ? ' adm-sidebar-item--active' : ''}${item.group ? ' adm-sidebar-item--child' : ''}`}
                  onClick={() => setPanel(item.id)}
                  title={item.label}
                >
                  <span className="adm-sidebar-item-icon">{item.icon}</span>
                  {!collapsed && <span className="adm-sidebar-item-label">{item.label}</span>}
                </button>
              );
            }
            return items;
          })()}
        </nav>
      </aside>

      {/* ── Main area ── */}
      <main className="adm-main">

        {panel === 'overview' && (
          <OverviewPanel counts={counts} onNavigate={setPanel} />
        )}

        {panel === 'users' && (
          <UsersPanel onManageContent={openUserContent} />
        )}

        {panel === 'user-content' && (
          <UserContentPanel
            userId={selectedUserId}
            userName={selectedUserName}
            onBack={() => setPanel('users')}
          />
        )}

        {panel === 'topics' && (
          <SplitPanel
            kicker="Content" title="Topics"
            description="Global topics are visible to all students. Create a topic first, then add lessons, questions, flashcards and cases under it."
            leftLabel="Create topic"
            left={<AdminForms topics={flatTopics} activeForm="topic" section="create" onSaved={refresh} />}
            rightLabel="Manage topics"
            right={<AdminForms topics={flatTopics} activeForm="topic" section="manage" onSaved={refresh} />}
          />
        )}

        {panel === 'lessons' && (
          <SplitPanel
            kicker="Content" title="Lessons"
            description="Write high-yield study lessons with clinical pearls and pitfalls. Lessons appear in the Study page for all students."
            leftLabel="Create lesson"
            left={<AdminForms topics={flatTopics} activeForm="lesson" onSaved={refresh} />}
            rightLabel="All lessons"
            right={<ContentManager type="lesson" refreshKey={cmRefreshKey} globalOnly />}
          />
        )}

        {panel === 'questions' && (
          <SplitPanel
            kicker="Content" title="Questions"
            description="Build USMLE-style MCQs with explanations and difficulty ratings. Questions appear in the Q-Bank for all students."
            leftLabel="Create question"
            left={<AdminForms topics={flatTopics} activeForm="question" onSaved={refresh} />}
            rightLabel="All questions"
            right={<ContentManager type="question" refreshKey={cmRefreshKey} globalOnly />}
          />
        )}

        {panel === 'flashcards' && (
          <SplitPanel
            kicker="Content" title="Flashcards"
            description="Create spaced-repetition flashcards. Students review them in their SRS queue on the Flashcards page."
            leftLabel="Create flashcard"
            left={<AdminForms topics={flatTopics} activeForm="flashcard" onSaved={refresh} />}
            rightLabel="All flashcards"
            right={<ContentManager type="flashcard" refreshKey={cmRefreshKey} globalOnly />}
          />
        )}

        {panel === 'cases' && (
          <SplitPanel
            kicker="Content" title="Cases"
            description="Add clinical case studies: presentation, investigations, diagnosis and management. Cases appear in the Cases page for all students."
            leftLabel="Create case"
            left={<AdminForms topics={flatTopics} activeForm="case" onSaved={refresh} />}
            rightLabel="All cases"
            right={<ContentManager type="case" refreshKey={cmRefreshKey} globalOnly />}
          />
        )}

        {panel === 'ai'      && <AIGeneratorPanel topics={flatTopics} />}
        {panel === 'library' && <ContentLibrary topics={topics} />}

      </main>
    </div>
  );
}

// ── Overview panel ────────────────────────────────────────────────────────────
const QUICK_ACTIONS: { id: PanelId; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'topics',     icon: '🗂️',  label: 'Topics',          desc: 'Create & manage global topics',    color: 'purple' },
  { id: 'lessons',    icon: '📖', label: 'Lessons',          desc: 'Write study lessons → Study page', color: 'blue'   },
  { id: 'questions',  icon: '📝', label: 'Questions',        desc: 'Build MCQs → Q-Bank',              color: 'green'  },
  { id: 'flashcards', icon: '🃏', label: 'Flashcards',       desc: 'SRS cards → Flashcards page',      color: 'amber'  },
  { id: 'cases',      icon: '🩺', label: 'Cases',            desc: 'Clinical cases → Cases page',      color: 'pink'   },
  { id: 'ai',         icon: '🤖', label: 'AI Generator',     desc: 'Generate from notes',              color: 'indigo' },
  { id: 'users',      icon: '👥', label: 'Users',            desc: 'Manage access & roles',            color: 'cyan'   },
  { id: 'library',    icon: '📚', label: 'Content Library',  desc: 'Browse all content',               color: 'rose'   },
];

function OverviewPanel({ counts, onNavigate }: { counts: Counts; onNavigate: (p: PanelId) => void }) {
  const stats = [
    { label: 'Users',      value: counts[0], icon: '👥', cls: 'adm-stat-value--accent'  },
    { label: 'Topics',     value: counts[1], icon: '🗂️',  cls: 'adm-stat-value--purple' },
    { label: 'Questions',  value: counts[2], icon: '📝', cls: 'adm-stat-value--green'   },
    { label: 'Flashcards', value: counts[3], icon: '🃏', cls: 'adm-stat-value--amber'   },
    { label: 'Lessons',    value: counts[4], icon: '📖', cls: 'adm-stat-value--pink'    },
  ];
  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div className="kicker">Admin</div>
        <h2>Overview</h2>
        <p className="muted">Platform-wide statistics and quick navigation.</p>
      </div>

      <div className="adm-overview-grid">
        {stats.map(s => (
          <div key={s.label} className="adm-stat-card">
            <div className="adm-stat-icon">{s.icon}</div>
            <div className={`adm-stat-value ${s.cls}`}>{s.value}</div>
            <div className="adm-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="adm-overview-section">
        <h3 className="adm-section-label">Quick navigation</h3>
        <div className="adm-quick-grid">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              type="button"
              className={`adm-quick-card adm-quick-card--${a.color}`}
              onClick={() => onNavigate(a.id)}
            >
              <span className="adm-quick-icon">{a.icon}</span>
              <span className="adm-quick-label">{a.label}</span>
              <span className="adm-quick-desc">{a.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Users panel ───────────────────────────────────────────────────────────────
function UsersPanel({ onManageContent }: { onManageContent: (id: string, name: string) => void }) {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleSection(userId: string, section: string, blocked: string[]) {
    const next = blocked.includes(section)
      ? blocked.filter(s => s !== section)
      : [...blocked, section];
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, blockedSections: next } : u));
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedSections: next }),
    });
  }

  async function toggleRole(userId: string, currentRole: string) {
    const next = currentRole === 'ADMIN' ? 'STUDENT' : 'ADMIN';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: next } : u));
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    });
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div className="kicker">Management</div>
        <h2>Users</h2>
        <p className="muted">Control section access, roles, and per-user content for each student.</p>
      </div>

      <div className="adm-users-toolbar">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="adm-users-search"
        />
        <span className="muted adm-users-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="adm-section-legend">
        {SECTIONS.map(s => (
          <span key={s.key} className="adm-section-legend-item" title={s.label}>
            {s.icon} {s.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="adm-loading">Loading users…</div>
      ) : filtered.length === 0 ? (
        <p className="muted">No users found.</p>
      ) : (
        <div className="adm-users-list">
          {filtered.map(user => (
            <div key={user.id} className="adm-user-card">
              <div className="adm-user-top">
                <div className="adm-user-info">
                  <div className="adm-user-name">{user.name}</div>
                  <div className="adm-user-email muted">{user.email}</div>
                  <div className="adm-user-meta muted">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    &nbsp;·&nbsp;{user._count.attempts} Qs&nbsp;·&nbsp;{user._count.reviews} cards
                  </div>
                </div>
                <div className="adm-user-badges">
                  <button
                    type="button"
                    className="btn adm-manage-content-btn"
                    onClick={() => onManageContent(user.id, user.name)}
                    title="Manage this user's personal content"
                  >
                    📚 Content
                  </button>
                  <button
                    type="button"
                    className={`adm-role-badge adm-role-badge--${user.role.toLowerCase()}`}
                    onClick={() => toggleRole(user.id, user.role)}
                    title={`Click to make ${user.role === 'ADMIN' ? 'Student' : 'Admin'}`}
                  >
                    {user.role}
                  </button>
                </div>
              </div>

              <div className="adm-section-toggles">
                {SECTIONS.map(s => {
                  const blocked = user.blockedSections.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`adm-section-toggle${blocked ? ' adm-section-toggle--blocked' : ' adm-section-toggle--allowed'}`}
                      onClick={() => toggleSection(user.id, s.key, user.blockedSections)}
                      title={`${s.label}: ${blocked ? 'Blocked — click to allow' : 'Allowed — click to block'}`}
                    >
                      <span>{s.icon}</span>
                      <span className="adm-toggle-label">{s.label}</span>
                      <span className="adm-toggle-state">{blocked ? '✕' : '✓'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
