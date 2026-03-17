export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { updateTopicProgress } from '@/lib/progress';

const attemptSchema = z.object({ questionId: z.string().min(1), selected: z.string().min(1) });

export async function GET() {
  const questions = await prisma.question.findMany({ include: { options: true, topic: true } });
  return NextResponse.json(questions);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { questionId, selected } = attemptSchema.parse(await request.json());
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return NextResponse.json({ message: 'Question not found.' }, { status: 404 });

    const isCorrect = selected === question.correctOptionId;
    await prisma.questionAttempt.create({ data: { userId: user.id, questionId, selected, isCorrect } });
    await updateTopicProgress(user.id, question.topicId);

    return NextResponse.json({ isCorrect });
  } catch (error) {
    const status = String(error).includes('UNAUTHORIZED') ? 401 : 400;
    return NextResponse.json({ message: 'Could not save attempt.', error: String(error) }, { status });
  }
}