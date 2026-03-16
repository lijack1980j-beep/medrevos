import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { percent } from '@/lib/analytics';

export async function GET() {
  const [topicCount, questionCount, flashcardCount, attempts, dueCards] = await Promise.all([
    prisma.topic.count(),
    prisma.question.count(),
    prisma.flashcard.count(),
    prisma.questionAttempt.findMany(),
    prisma.flashcard.count({ where: { dueDate: { lte: new Date() } } })
  ]);

  return NextResponse.json({
    topicCount,
    questionCount,
    flashcardCount,
    dueCards,
    accuracy: percent(attempts.filter((a) => a.isCorrect).length, attempts.length)
  });
}
