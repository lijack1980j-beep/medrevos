export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export default async function CalendarPage() {
  const user = await requireUser();
  if (!user) redirect('/auth/sign-in');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30);

  const [flashcardStates, questionSRS, attempts, reviews] = await Promise.all([
    prisma.userFlashcardState.findMany({
      where: { userId: user.id, dueDate: { lte: endDate } },
      include: { flashcard: { include: { topic: { select: { title: true } } } } },
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
  ]);

  // Build day map for next 30 days
  type DayData = { date: Date; dueCards: number; dueQuestions: number; studiedPast: boolean; isToday: boolean };
  const days: DayData[] = [];

  const studiedDays = new Set([
    ...attempts.map(a => a.createdAt.toISOString().slice(0, 10)),
    ...reviews.map(r => r.reviewedAt.toISOString().slice(0, 10)),
  ]);

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);

    const dueCards = flashcardStates.filter(s => {
      const due = new Date(s.dueDate);
      due.setHours(0, 0, 0, 0);
      return due <= d;
    }).length;

    const dueQs = questionSRS.filter(s => {
      const due = new Date(s.dueDate);
      due.setHours(0, 0, 0, 0);
      return due <= d;
    }).length;

    days.push({
      date: d,
      dueCards: i === 0 ? dueCards : Math.max(0, dueCards - (i > 0 ? days[i - 1].dueCards : 0)),
      dueQuestions: i === 0 ? dueQs : Math.max(0, dueQs - (i > 0 ? days[i - 1].dueQuestions : 0)),
      studiedPast: studiedDays.has(dStr),
      isToday: i === 0,
    });
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="cal-page">
      <div>
        <div className="kicker">30-day view</div>
        <h1>Revision calendar</h1>
        <p className="muted">Upcoming flashcard and question SRS reviews, plus your past study days.</p>
      </div>

      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot--cards" />Flashcards due</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--qs" />Questions due</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--studied" />Studied</span>
      </div>

      <div className="cal-grid">
        {days.map((day, i) => {
          const load = day.dueCards + day.dueQuestions;
          const intensity = load === 0 ? 0 : load <= 5 ? 1 : load <= 15 ? 2 : 3;
          return (
            <div
              key={i}
              className={[
                'cal-cell',
                day.isToday ? 'cal-cell--today' : '',
                day.studiedPast && !day.isToday ? 'cal-cell--studied' : '',
                `cal-cell--load-${intensity}`,
              ].filter(Boolean).join(' ')}
            >
              <div className="cal-cell-date">
                <span className="cal-cell-day">{day.date.getDate()}</span>
                <span className="cal-cell-month">{months[day.date.getMonth()]}</span>
              </div>
              {day.dueCards > 0 && (
                <div className="cal-cell-stat cal-cell-stat--cards">
                  ⚡ {day.dueCards}
                </div>
              )}
              {day.dueQuestions > 0 && (
                <div className="cal-cell-stat cal-cell-stat--qs">
                  📝 {day.dueQuestions}
                </div>
              )}
              {day.studiedPast && !day.isToday && (
                <div className="cal-cell-studied">✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
