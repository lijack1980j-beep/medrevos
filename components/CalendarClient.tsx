'use client';

import { useState, useEffect, useRef } from 'react';

type EventType = 'EVENT' | 'EXAM' | 'NOTE';

export interface DayData {
  dateStr: string;
  dayNum: number;
  monthIdx: number;
  isToday: boolean;
  studiedPast: boolean;
  dueCards: number;
  dueQuestions: number;
}

export interface CalEvent {
  id: string;
  type: EventType;
  title: string;
  dateStr: string;
  note?: string | null;
  color?: string | null;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_CONFIG = {
  EVENT: { label: 'Event',  icon: '📅', color: '#6366f1', bg: 'rgba(99,102,241,0.18)'  },
  EXAM:  { label: 'Exam',   icon: '🎯', color: '#ef4444', bg: 'rgba(239,68,68,0.18)'   },
  NOTE:  { label: 'Note',   icon: '📝', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)'  },
} as const;

const TYPE_PRIORITY: Record<EventType, number> = { EXAM: 0, EVENT: 1, NOTE: 2 };

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function CalendarClient({ days, initialEvents }: { days: DayData[]; initialEvents: CalEvent[] }) {
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [addVisible, setAddVisible]     = useState(false);
  const [showDetail, setShowDetail]     = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [form, setForm] = useState({ type: 'EVENT' as EventType, title: '', note: '' });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  function openModal(dateStr: string) {
    setSelectedDate(dateStr);
    setForm({ type: 'EVENT', title: '', note: '' });
    setShowAdd(true);
    setTimeout(() => { setAddVisible(true); titleRef.current?.focus(); }, 20);
  }

  function closeAdd() {
    setAddVisible(false);
    setTimeout(() => setShowAdd(false), 250);
  }

  function openDetail(ev: CalEvent, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedEvent(ev);
    setShowDetail(true);
    setTimeout(() => setDetailVisible(true), 20);
  }

  function closeDetail() {
    setDetailVisible(false);
    setTimeout(() => { setShowDetail(false); setSelectedEvent(null); }, 250);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !selectedDate) return;
    setSaving(true);
    const res = await fetch('/api/calendar-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.type,
        title: form.title.trim(),
        dateStr: selectedDate,
        note: form.note.trim() || null,
        color: TYPE_CONFIG[form.type].color,
      }),
    });
    if (res.ok) {
      const { event } = await res.json();
      setEvents(prev => [...prev, event]);
      closeAdd();
    }
    setSaving(false);
  }

  async function deleteEvent() {
    if (!selectedEvent) return;
    setDeleting(true);
    await fetch(`/api/calendar-events?id=${selectedEvent.id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
    setDeleting(false);
    closeDetail();
  }

  // Build event map, sorted smartly
  const eventsMap = events.reduce<Record<string, CalEvent[]>>((acc, ev) => {
    (acc[ev.dateStr] ??= []).push(ev);
    return acc;
  }, {});
  Object.values(eventsMap).forEach(arr => arr.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]));

  // Week day header — start from Sunday of the first day
  const firstDate = new Date(days[0].dateStr + 'T00:00:00');
  const startOffset = firstDate.getDay(); // 0=Sun
  const headerDays = WEEKDAYS.slice(startOffset).concat(WEEKDAYS.slice(0, startOffset));

  return (
    <div className="cal-client-wrap">

      {/* Week day header */}
      <div className="cal-weekday-row">
        {WEEKDAYS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
      </div>

      {/* Grid — staggered animation via CSS + inline delay */}
      <div className="cal-grid">
        {days.map((day, i) => {
          const load = day.dueCards + day.dueQuestions;
          const intensity = load === 0 ? 0 : load <= 5 ? 1 : load <= 15 ? 2 : 3;
          const dayEvents = eventsMap[day.dateStr] ?? [];
          const hasExam = dayEvents.some(e => e.type === 'EXAM');

          return (
            <div
              key={day.dateStr}
              className={[
                'cal-cell',
                day.isToday ? 'cal-cell--today' : '',
                day.studiedPast && !day.isToday ? 'cal-cell--studied' : '',
                `cal-cell--load-${intensity}`,
                hasExam ? 'cal-cell--has-exam' : '',
                mounted ? 'cal-cell--in' : '',
              ].filter(Boolean).join(' ')}
              style={{ animationDelay: mounted ? `${i * 0.022}s` : '0s' }}
              onClick={() => openModal(day.dateStr)}
              title={`Add event on ${formatDate(day.dateStr)}`}
            >
              <div className="cal-cell-date">
                <span className="cal-cell-day">{day.dayNum}</span>
                <span className="cal-cell-month">{MONTHS[day.monthIdx]}</span>
                {day.isToday && <span className="cal-cell-today-badge">Today</span>}
              </div>

              {/* User events (smart: EXAM > EVENT > NOTE) */}
              {dayEvents.slice(0, 2).map(ev => (
                <div
                  key={ev.id}
                  className={`cal-event-pill cal-event-pill--${ev.type.toLowerCase()}`}
                  style={{ background: TYPE_CONFIG[ev.type].bg, borderLeftColor: ev.color ?? TYPE_CONFIG[ev.type].color }}
                  onClick={e => openDetail(ev, e)}
                  title={ev.title}
                >
                  <span className="cal-event-icon">{TYPE_CONFIG[ev.type].icon}</span>
                  <span className="cal-event-title">{ev.title}</span>
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="cal-event-more" onClick={e => openDetail(dayEvents[2], e)}>
                  +{dayEvents.length - 2} more
                </div>
              )}

              {/* SRS stats */}
              <div className="cal-cell-stats">
                {day.dueCards > 0 && (
                  <span className="cal-cell-stat cal-cell-stat--cards" title="Flashcards due">⚡ {day.dueCards}</span>
                )}
                {day.dueQuestions > 0 && (
                  <span className="cal-cell-stat cal-cell-stat--qs" title="Questions due">📝 {day.dueQuestions}</span>
                )}
                {day.studiedPast && !day.isToday && (
                  <span className="cal-cell-studied" title="Studied this day">✓</span>
                )}
              </div>

              {/* Hover add hint */}
              <div className="cal-cell-add-hint">+ Add</div>
            </div>
          );
        })}
      </div>

      {/* ── Add Event Modal ─────────────────────────────────────────── */}
      {showAdd && (
        <div className={`cal-modal-overlay${addVisible ? ' cal-modal-overlay--in' : ''}`} onClick={closeAdd}>
          <div className={`cal-modal${addVisible ? ' cal-modal--in' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h3 className="cal-modal-title">Add to calendar</h3>
              <div className="cal-modal-date">{selectedDate ? formatDate(selectedDate) : ''}</div>
              <button type="button" className="cal-modal-close" onClick={closeAdd} aria-label="Close">✕</button>
            </div>

            <form onSubmit={addEvent} className="cal-modal-form">
              {/* Type selector */}
              <div className="cal-type-pills">
                {(Object.keys(TYPE_CONFIG) as EventType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`cal-type-pill${form.type === t ? ' cal-type-pill--active' : ''}`}
                    style={form.type === t ? { background: TYPE_CONFIG[t].bg, borderColor: TYPE_CONFIG[t].color, color: TYPE_CONFIG[t].color } : {}}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                  >
                    {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>

              <div className="cal-form-field">
                <label className="cal-form-label">Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.type === 'EXAM' ? 'e.g. Cardiology mock exam' : form.type === 'NOTE' ? 'e.g. Review electrolytes' : 'e.g. Study group session'}
                  className="cal-form-input"
                  required
                  maxLength={200}
                />
              </div>

              <div className="cal-form-field">
                <label className="cal-form-label">Note <span className="cal-form-optional">(optional)</span></label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Any details, reminders, or context…"
                  className="cal-form-textarea"
                  rows={3}
                  maxLength={1000}
                />
              </div>

              {/* Smart suggestions */}
              {form.type === 'EXAM' && (
                <div className="cal-smart-tip cal-smart-tip--exam">
                  🎯 Tip: Schedule a revision session 2–3 days before your exam for best retention.
                </div>
              )}
              {form.type === 'NOTE' && (
                <div className="cal-smart-tip cal-smart-tip--note">
                  📝 Notes appear in your daily review so you never miss them.
                </div>
              )}

              <div className="cal-modal-actions">
                <button type="button" className="btn cal-modal-cancel" onClick={closeAdd}>Cancel</button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving || !form.title.trim()}
                  style={{ background: TYPE_CONFIG[form.type].color }}
                >
                  {saving ? 'Saving…' : `Add ${TYPE_CONFIG[form.type].label}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      {showDetail && selectedEvent && (
        <div className={`cal-modal-overlay${detailVisible ? ' cal-modal-overlay--in' : ''}`} onClick={closeDetail}>
          <div className={`cal-modal cal-modal--detail${detailVisible ? ' cal-modal--in' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="cal-detail-type-badge" style={{ background: TYPE_CONFIG[selectedEvent.type].bg, color: TYPE_CONFIG[selectedEvent.type].color }}>
              {TYPE_CONFIG[selectedEvent.type].icon} {TYPE_CONFIG[selectedEvent.type].label}
            </div>
            <button type="button" className="cal-modal-close" onClick={closeDetail} aria-label="Close">✕</button>

            <h3 className="cal-detail-title">{selectedEvent.title}</h3>
            <div className="cal-detail-date">{formatDate(selectedEvent.dateStr)}</div>

            {selectedEvent.note && (
              <div className="cal-detail-note">{selectedEvent.note}</div>
            )}

            <div className="cal-detail-actions">
              <button type="button" className="btn cal-modal-cancel" onClick={closeDetail}>Close</button>
              <button
                type="button"
                className="btn cal-delete-btn"
                onClick={deleteEvent}
                disabled={deleting}
              >
                {deleting ? 'Removing…' : 'Remove event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
