export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { percent } from '@/lib/analytics';

export async function GET() {
  const user = await getCurrentUser();

  const [topicCount, questionCount, flashcardCount, dueCards, correctCount, totalCount] = await Promise.all([
    prisma.topic.count(),
    prisma.question.count(),
    prisma.flashcard.count(),
    user
      ? prisma.flashcard.count({ where: { dueDate: { lte: new Date() } } })
      : 0,
    user
      ? prisma.questionAttempt.count({ where: { userId: user.id, isCorrect: true } })
      : 0,
    user
      ? prisma.questionAttempt.count({ where: { userId: user.id } })
      : 0,
  ]);

  return NextResponse.json({
    topicCount,
    questionCount,
    flashcardCount,
    dueCards,
    accuracy: percent(correctCount, totalCount),
  });
}
