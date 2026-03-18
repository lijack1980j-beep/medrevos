'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminForms } from '@/components/AdminForms';
import { ContentLibrary } from '@/components/ContentLibrary';
import { AIGeneratorPanel } from '@/components/AIGeneratorPanel';
import { ContentManager } from '@/components/ContentManager';
import { UserContentPanel } from '@/components/UserContentPanel';
import { SECTIONS, type SectionKey } from '@/lib/access';

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Sidebar config ───────────────────────────────────────────────────────────
type PanelId = 'overview' | 'users' | 'user-content' | 'topics' | 'lessons' | 'questions' | 'flashcards' | 'cases' | 'ai' | 'library';

const SIDEBAR: { id: PanelId; label: string; icon: string; group?: string }[] = [
  { id: 'overview',   label: 'Overview',        icon: '📊' },
  { id: 'users',      label: 'Users',           icon: '👥' },
  { id: 'topics',     label: 'Topics',          icon: '🗂️',  group: 'Content' },
  { id: 'lessons',    label: 'Lessons',         icon: '📖', group: 'Content' },
  { id: 'questions',  label: 'Questions',       icon: '📝', group: 'Content' },
  { id: 'flashcards', label: 'Flashcards',      icon: '🃏', group: 'Content' },
  { id: 'cases',      label: 'Cases',           icon: '🩺', group: 'Content' },
  { id: 'ai',         label: 'AI Generator',    icon: '🤖' },
  { id: 'library',    label: 'Content Library', icon: '📚' },
];

// ── Main shell ───────────────────────────────────────────────────────────────
export function AdminShell({ topics, flatTopics, counts }: {
  topics: Topic[];
  flatTopics: FlatTopic[];
  counts: Counts;
}) {
  const [panel, setPanel]               = useState<PanelId>('overview');
  const [collapsed, setCollapsed]       = useState(false);
  const [contentOpen, setContentOpen]   = useState(true);
  const [selectedUserId,   setSelectedUserId]   = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');

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
            const items: React.ReactNode[] = [];
            let lastGroup: string | undefined;

            for (const item of SIDEBAR) {
              // Group header for "Content"
              if (item.group && item.group !== lastGroup) {
                lastGroup = item.group;
                items.push(
                  <button
                    key={`group-${item.group}`}
                    type="button"
                    className="adm-sidebar-group"
                    onClick={() => setContentOpen(o => !o)}
                    title={item.group}
                  >
                    <span className="adm-sidebar-group-icon">📚</span>
                    {!collapsed && (
                      <>
                        <span className="adm-sidebar-group-label">{item.group}</span>
                        <span className="adm-sidebar-group-chevron">{contentOpen ? '▾' : '▸'}</span>
                      </>
                    )}
                  </button>
                );
              }

              // Skip group children when group is collapsed
              if (item.group && !contentOpen) continue;

              items.push(
                <button
                  key={item.id}
                  type="button"
                  className={`adm-sidebar-item${panel === item.id ? ' adm-sidebar-item--active' : ''}${item.group ? ' adm-sidebar-item--child' : ''}`}
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
        {panel === 'overview'      && <OverviewPanel counts={counts} />}
        {panel === 'users'         && <UsersPanel onManageContent={(id, name) => { setSelectedUserId(id); setSelectedUserName(name); setPanel('user-content'); }} />}
        {panel === 'user-content'  && <UserContentPanel userId={selectedUserId} userName={selectedUserName} onBack={() => setPanel('users')} />}
        {panel === 'topics'        && <AdminForms topics={flatTopics} activeForm="topic" />}
        {panel === 'lessons'       && <><AdminForms topics={flatTopics} activeForm="lesson" /><ContentManager type="lesson" topics={flatTopics} /></>}
        {panel === 'questions'     && <><AdminForms topics={flatTopics} activeForm="question" /><ContentManager type="question" topics={flatTopics} /></>}
        {panel === 'flashcards'    && <><AdminForms topics={flatTopics} activeForm="flashcard" /><ContentManager type="flashcard" topics={flatTopics} /></>}
        {panel === 'cases'         && <><AdminForms topics={flatTopics} activeForm="case" /><ContentManager type="case" topics={flatTopics} /></>}
        {panel === 'ai'            && <AIGeneratorPanel topics={flatTopics} />}
        {panel === 'library'       && <ContentLibrary topics={topics} />}
      </main>
    </div>
  );
}

// ── Overview panel ───────────────────────────────────────────────────────────
function OverviewPanel({ counts }: { counts: Counts }) {
  const stats = [
    { label: 'Users',      value: counts[0], icon: '👥', cls: 'adm-stat-value--accent' },
    { label: 'Topics',     value: counts[1], icon: '🗂️',  cls: 'adm-stat-value--purple' },
    { label: 'Questions',  value: counts[2], icon: '📝', cls: 'adm-stat-value--green'  },
    { label: 'Flashcards', value: counts[3], icon: '🃏', cls: 'adm-stat-value--amber'  },
    { label: 'Lessons',    value: counts[4], icon: '📖', cls: 'adm-stat-value--pink'   },
  ];
  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div className="kicker">Admin</div>
        <h2>Overview</h2>
        <p className="muted">Platform-wide statistics at a glance.</p>
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
    </div>
  );
}

// ── Users panel ──────────────────────────────────────────────────────────────
function UsersPanel({ onManageContent }: { onManageContent: (id: string, name: string) => void }) {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleSection(userId: string, section: string, blocked: string[]) {
    const next = blocked.includes(section)
      ? blocked.filter(s => s !== section)
      : [...blocked, section];
    // Optimistic
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
        <p className="muted">Control each student's section access and roles. Blocked sections hide from their navigation instantly.</p>
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

      {/* Section access legend */}
      <div className="adm-section-legend">
        {SECTIONS.map(s => (
          <span key={s.key} className="adm-section-legend-item" title={s.label}>
            {s.icon} {s.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="adm-loading">Loading users…</div>
      ) : (
        <div className="adm-users-list">
          {filtered.map(user => (
            <div key={user.id} className="adm-user-card">
              <div className="adm-user-info">
                <div className="adm-user-name">{user.name}</div>
                <div className="adm-user-email muted">{user.email}</div>
                <div className="adm-user-meta muted">
                  {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  &nbsp;·&nbsp;{user._count.attempts} Qs&nbsp;·&nbsp;{user._count.reviews} cards
                </div>
              </div>

              <div className="adm-user-controls">
                {/* Manage Content button */}
                <button
                  type="button"
                  className="btn adm-manage-content-btn"
                  onClick={() => onManageContent(user.id, user.name)}
                  title="Manage this user's content"
                >
                  📚 Manage Content
                </button>

                {/* Role badge toggle */}
                <button
                  type="button"
                  className={`adm-role-badge adm-role-badge--${user.role.toLowerCase()}`}
                  onClick={() => toggleRole(user.id, user.role)}
                  title={`Click to make ${user.role === 'ADMIN' ? 'Student' : 'Admin'}`}
                >
                  {user.role}
                </button>

                {/* Section access toggles */}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
