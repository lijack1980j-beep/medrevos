export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { checkAccess } from '@/lib/access';
import { CalendarClient, type DayData, type CalEvent } from '@/components/CalendarClient';

export default async function CalendarPage() {
  const user = await requireUser();
  checkAccess(user, 'calendar');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30);

  const [flashcardStates, questionSRS, attempts, reviews, calendarEvents] = await Promise.all([
    prisma.userFlashcardState.findMany({
      where: { userId: user.id, dueDate: { lte: endDate } },
      select: { dueDate: true },
    }),
    prisma.questionSRSState.findMany({
      where: { userId: user.id, dueDate: { lte: endDate } },
      select: { dueDate: true },
    }),
    prisma.questionAttempt.findMany({
      where: { userId: user.id, createdAt: { gte: new Date(today.getTime() - 30 * 86400000) } },
      select: { createdAt: true },
    }),
    prisma.flashcardReview.findMany({
      where: { userId: user.id, reviewedAt: { gte: new Date(today.getTime() - 30 * 86400000) } },
      select: { reviewedAt: true },
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id },
      select: { id: true, type: true, title: true, dateStr: true, note: true, color: true },
      orderBy: { dateStr: 'asc' },
    }),
  ]);

  const studiedDays = new Set([
    ...attempts.map(a => a.createdAt.toISOString().slice(0, 10)),
    ...reviews.map(r => r.reviewedAt.toISOString().slice(0, 10)),
  ]);

  // Build per-day due counts using a date-string bucket map (O(n+m) instead of O(n*m))
  const cardDueBuckets: Record<string, number> = {};
  for (const s of flashcardStates) {
    const d = new Date(s.dueDate); d.setHours(0, 0, 0, 0);
    const key = d < today ? today.toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    cardDueBuckets[key] = (cardDueBuckets[key] ?? 0) + 1;
  }
  const qDueBuckets: Record<string, number> = {};
  for (const s of questionSRS) {
    const d = new Date(s.dueDate); d.setHours(0, 0, 0, 0);
    const key = d < today ? today.toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    qDueBuckets[key] = (qDueBuckets[key] ?? 0) + 1;
  }

  const days: DayData[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);

    days.push({
      dateStr: dStr,
      dayNum: d.getDate(),
      monthIdx: d.getMonth(),
      isToday: i === 0,
      studiedPast: studiedDays.has(dStr),
      dueCards: cardDueBuckets[dStr] ?? 0,
      dueQuestions: qDueBuckets[dStr] ?? 0,
    });
  }

  const initialEvents: CalEvent[] = calendarEvents.map(e => ({
    id: e.id,
    type: e.type as CalEvent['type'],
    title: e.title,
    dateStr: e.dateStr,
    note: e.note,
    color: e.color,
  }));

  // Stats for header
  const totalExams   = calendarEvents.filter(e => e.type === 'EXAM').length;
  const totalEvents  = calendarEvents.filter(e => e.type === 'EVENT').length;
  const totalNotes   = calendarEvents.filter(e => e.type === 'NOTE').length;
  const totalSRSDue  = days.reduce((s, d) => s + d.dueCards + d.dueQuestions, 0);

  return (
    <div className="cal-page">
      <div>
        <div className="kicker">30-day planner</div>
        <h1>Study calendar</h1>
        <p className="muted">Click any day to add an event, exam, or note. Your SRS reviews are shown automatically.</p>
      </div>

      {/* Summary bar */}
      <div className="cal-summary-bar">
        <div className="cal-summary-card cal-summary-card--srs">
          <span className="cal-summary-num">{totalSRSDue}</span>
          <span className="cal-summary-label">SRS items due</span>
        </div>
        <div className="cal-summary-card cal-summary-card--exam">
          <span className="cal-summary-num">{totalExams}</span>
          <span className="cal-summary-label">Exams planned</span>
        </div>
        <div className="cal-summary-card cal-summary-card--event">
          <span className="cal-summary-num">{totalEvents}</span>
          <span className="cal-summary-label">Events</span>
        </div>
        <div className="cal-summary-card cal-summary-card--note">
          <span className="cal-summary-num">{totalNotes}</span>
          <span className="cal-summary-label">Notes</span>
        </div>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot--cards" />Flashcards due</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--qs" />Questions due</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--studied" />Studied</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--exam" />Exam</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--event" />Event</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--note" />Note</span>
      </div>

      <CalendarClient days={days} initialEvents={initialEvents} />
    </div>
  );
}
