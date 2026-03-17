export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { QuestionBank } from '@/components/QuestionBank';
import { getCurrentUser } from '@/lib/auth';

export default async function QuestionsPage({ searchParams }: { searchParams?: { topic?: string } }) {
  const user = await getCurrentUser();
  const topicSlug = searchParams?.topic;

  const [questions, bookmarks, wrongAttempts, allAttempts, srsStates] = await Promise.all([
    prisma.question.findMany({
      where: topicSlug ? { topic: { slug: topicSlug } } : undefined,
      include: { options: true, topic: true },
      orderBy: { createdAt: 'asc' },
    }),
    user
      ? prisma.bookmark.findMany({ where: { userId: user.id }, select: { questionId: true } })
      : Promise.resolve([]),
    user
      ? prisma.questionAttempt.findMany({
          where: { userId: user.id, isCorrect: false },
          select: { questionId: true },
          distinct: ['questionId'],
        })
      : Promise.resolve([]),
    user
      ? prisma.questionAttempt.findMany({
          where: { userId: user.id },
          select: { questionId: true, isCorrect: true },
        })
      : Promise.resolve([]),
    user
      ? prisma.questionSRSState.findMany({
          where: { userId: user.id },
          select: { questionId: true, dueDate: true, intervalDays: true, easeFactor: true, repetitions: true },
        })
      : Promise.resolve([]),
  ]);

  const wrongIds     = wrongAttempts.map(a => a.questionId);
  const attemptedIds = [...new Set(allAttempts.map(a => a.questionId))];

  // Per-question accuracy map
  const accuracyMap: Record<string, number> = {};
  for (const qId of attemptedIds) {
    const qAttempts = allAttempts.filter(a => a.questionId === qId);
    accuracyMap[qId] = Math.round((qAttempts.filter(a => a.isCorrect).length / qAttempts.length) * 100);
  }

  return (
    <div className="qb-page">
      <div>
        <div className="kicker">Exam trainer</div>
        <h1>Question bank{topicSlug ? ` — ${questions[0]?.topic.title ?? topicSlug}` : ''}</h1>
        <p className="muted">Solve exam-style MCQs, store attempts, and review explanations immediately.</p>
      </div>
      <QuestionBank
        initialQuestions={questions}
        bookmarkedIds={bookmarks.map(b => b.questionId)}
        wrongIds={wrongIds}
        attemptedIds={attemptedIds}
        accuracyMap={accuracyMap}
        srsStates={srsStates.map(s => ({ ...s, dueDate: s.dueDate.toISOString() }))}
      />
    </div>
  );
}
