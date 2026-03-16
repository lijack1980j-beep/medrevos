import { prisma } from '@/lib/db';
import { QuestionBank } from '@/components/QuestionBank';
import { getCurrentUser } from '@/lib/auth';

export default async function QuestionsPage({ searchParams }: { searchParams?: { topic?: string } }) {
  const user = await getCurrentUser();
  const topicSlug = searchParams?.topic;

  const [questions, bookmarks] = await Promise.all([
    prisma.question.findMany({
      where: topicSlug ? { topic: { slug: topicSlug } } : undefined,
      include: { options: true, topic: { select: { title: true, system: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    user
      ? prisma.bookmark.findMany({ where: { userId: user.id }, select: { questionId: true } })
      : Promise.resolve([]),
  ]);

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
      />
    </div>
  );
}
