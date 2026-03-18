export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/AdminShell';

export default async function AdminPage() {
  await requireAdmin();

  const [topics, userCount, topicCount, questionCount, flashcardCount, lessonCount] = await Promise.all([
    prisma.topic.findMany({
      select: {
        id: true, title: true, slug: true, system: true,
        summary: true, difficulty: true, estMinutes: true, highYield: true,
        flashcards: { select: { id: true, front: true, back: true, note: true }, orderBy: { createdAt: 'asc' } },
        questions: {
          select: {
            id: true, stem: true, explanation: true, difficulty: true, correctOptionId: true,
            options: { select: { id: true, label: true, text: true, isCorrect: true }, orderBy: { label: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ system: 'asc' }, { title: 'asc' }],
    }),
    prisma.user.count(),
    prisma.topic.count(),
    prisma.question.count(),
    prisma.flashcard.count(),
    prisma.lesson.count(),
  ]);

  const flatTopics = topics.map(({ flashcards: _f, questions: _q, ...t }) => t);

  return (
    <AdminShell
      topics={topics}
      flatTopics={flatTopics}
      counts={[userCount, topicCount, questionCount, flashcardCount, lessonCount]}
    />
  );
}
