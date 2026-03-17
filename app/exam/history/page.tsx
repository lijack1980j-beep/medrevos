export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export default async function ExamHistoryPage() {
  const user = await requireUser();

  const sessions = await prisma.examSession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    include: {
      answers: {
        include: { question: { select: { topic: { select: { system: true } } } } },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  return (
    <div className="eh-page">
      <div className="eh-header">
        <div>
          <div className="kicker">Past exams</div>
          <h1>Exam history</h1>
          <p className="muted">{sessions.length} completed exam{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/exam" className="btn primary">New exam</Link>
      </div>

      {sessions.length === 0 ? (
        <div className="panel eh-empty">
          <div className="eh-empty-icon">📋</div>
          <h3>No exams yet</h3>
          <p className="muted">Complete a timed exam to see your results here.</p>
          <Link href="/exam" className="btn primary">Start your first exam</Link>
        </div>
      ) : (
        <div className="eh-list">
          {sessions.map((s, i) => {
            const total    = s.answers.length;
            const correct  = s.answers.filter(a => a.isCorrect).length;
            const score    = total > 0 ? Math.round((correct / total) * 100) : 0;
            const duration = s.finishedAt
              ? Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 60000)
              : Math.round(s.timeLimitSec / 60);
            const systems  = [...new Set(s.answers.map(a => a.question.topic.system))];
            const scoreClass = score >= 70 ? 'eh-score--good' : score >= 50 ? 'eh-score--ok' : 'eh-score--low';

            return (
              <Link key={s.id} href={`/exam/${s.id}/results`} className="eh-row panel">
                <div className="eh-row-left">
                  <span className="eh-num">#{sessions.length - i}</span>
                  <div className="eh-row-info">
                    <div className="eh-row-date">
                      {s.startedAt.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="eh-row-time muted">
                        {s.startedAt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="eh-row-systems">
                      {systems.slice(0, 4).map(sys => (
                        <span key={sys} className="badge">{sys}</span>
                      ))}
                      {systems.length > 4 && <span className="muted">+{systems.length - 4}</span>}
                    </div>
                  </div>
                </div>
                <div className="eh-row-right">
                  <div className="eh-row-stats">
                    <span className="muted">{total} Qs</span>
                    <span className="muted">·</span>
                    <span className="muted">{duration}m</span>
                  </div>
                  <div className={`eh-score ${scoreClass}`}>{score}%</div>
                  <span className="eh-arrow">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}