import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export default async function ExamResultsPage({ params }: { params: { sessionId: string } }) {
  const user = await requireUser();
  const session = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        include: {
          question: {
            include: {
              options:  { orderBy: { label: 'asc' } },
              topic:    { select: { title: true, system: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!session || session.userId !== user.id) redirect('/exam');
  if (session.status !== 'COMPLETED') redirect(`/exam/${params.sessionId}`);

  const total    = session.answers.length;
  const correct  = session.answers.filter(a => a.isCorrect).length;
  const score    = total > 0 ? Math.round((correct / total) * 100) : 0;
  const duration = session.finishedAt
    ? Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 1000)
    : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  const scoreColor = score >= 70 ? '#34d399' : score >= 50 ? '#fb923c' : '#f87171';

  return (
    <div className="exam-results">

      <div className="exam-results-header">
        <div className="kicker">Exam complete</div>
        <h1>Results</h1>
        <div className="exam-results-score-row">
          <div className="exam-results-score" style={{ color: scoreColor }}>{score}%</div>
          <div className="exam-results-meta">
            <span>{correct}/{total} correct</span>
            <span className="muted">·</span>
            <span className="muted">{mins}m {secs}s</span>
          </div>
        </div>
        <Link href="/exam" className="btn secondary">New exam</Link>
      </div>

      <div className="exam-results-list">
        {session.answers.map((a, i) => {
          const correct_opt = a.question.options.find(o => o.isCorrect);
          const selected_opt = a.selected ? a.question.options.find(o => o.id === a.selected) : null;
          return (
            <div key={a.id} className={`exam-result-item${a.isCorrect ? ' exam-result-item--correct' : a.selected ? ' exam-result-item--wrong' : ' exam-result-item--skipped'}`}>
              <div className="exam-result-header">
                <span className="exam-result-num">Q{i + 1}</span>
                <div className="exam-result-badges">
                  <span className="badge">{a.question.topic.system}</span>
                  <span className="badge">{a.question.topic.title}</span>
                </div>
                <span className={`exam-result-verdict${a.isCorrect ? ' exam-result-verdict--ok' : ''}`}>
                  {a.isCorrect ? '✓ Correct' : a.selected ? '✗ Wrong' : '— Skipped'}
                </span>
              </div>
              <p className="exam-result-stem">{a.question.stem}</p>
              <div className="exam-result-options">
                {a.question.options.map(opt => (
                  <div
                    key={opt.id}
                    className={[
                      'exam-result-opt',
                      opt.isCorrect ? 'exam-result-opt--correct' : '',
                      a.selected === opt.id && !opt.isCorrect ? 'exam-result-opt--wrong' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="exam-result-opt-label">{opt.label}.</span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
              <div className="exam-result-explanation">
                <span className="exam-result-explanation-label">Explanation</span>
                <p>{a.question.explanation}</p>
              </div>
              {!a.isCorrect && selected_opt && (
                <p className="exam-result-your-answer">
                  Your answer: <strong>{selected_opt.label}. {selected_opt.text}</strong>
                  {correct_opt && <> · Correct: <strong>{correct_opt.label}. {correct_opt.text}</strong></>}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
