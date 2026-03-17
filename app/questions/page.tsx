export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { QuestionBank } from '@/components/QuestionBank';
import { getCurrentUser } from '@/lib/auth';

export default async function QuestionsPage({ searchParams }: { searchParams?: { topic?: string } }) {
  const user = await getCurrentUser();
  const topicSlug = searchParams?.topic;

  const [questions, bookmarks, wrongAttempts] = await Promise.all([
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
  ]);

  // IDs answered incorrectly at least once (and not yet answered correctly after)
  const wrongIds = wrongAttempts.map(a => a.questionId);

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
      />
    </div>
  );
}