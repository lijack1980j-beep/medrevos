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
    }),
    prisma.questionSRSState.findMany({
      where: { userId: user.id, dueDate: { lte: endDate } },
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
      orderBy: { dateStr: 'asc' },
    }),
  ]);

  const studiedDays = new Set([
    ...attempts.map(a => a.createdAt.toISOString().slice(0, 10)),
    ...reviews.map(r => r.reviewedAt.toISOString().slice(0, 10)),
  ]);

  // Build cumulative due counts per day
  const allCardsDue = flashcardStates.map(s => { const d = new Date(s.dueDate); d.setHours(0,0,0,0); return d; });
  const allQsDue    = questionSRS.map(s => { const d = new Date(s.dueDate); d.setHours(0,0,0,0); return d; });

  const days: DayData[] = [];
  let prevCards = 0, prevQs = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);

    const cumCards = allCardsDue.filter(dd => dd <= d).length;
    const cumQs    = allQsDue.filter(dd => dd <= d).length;
    const dueCards     = i === 0 ? cumCards : Math.max(0, cumCards - prevCards);
    const dueQuestions = i === 0 ? cumQs    : Math.max(0, cumQs - prevQs);
    prevCards = cumCards;
    prevQs    = cumQs;

    days.push({
      dateStr: dStr,
      dayNum: d.getDate(),
      monthIdx: d.getMonth(),
      isToday: i === 0,
      studiedPast: studiedDays.has(dStr),
      dueCards,
      dueQuestions,
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
