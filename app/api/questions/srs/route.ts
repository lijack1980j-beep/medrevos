export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { nextReview } from '@/lib/spacedRepetition';
import { requireUser } from '@/lib/auth';

const schema = z.object({
  questionId: z.string().min(1),
  rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { questionId, rating } = schema.parse(await request.json());

    const state = await prisma.questionSRSState.findUnique({
      where: { userId_questionId: { userId: user.id, questionId } },
    });

    const next = nextReview(
      { intervalDays: state?.intervalDays ?? 0, easeFactor: state?.easeFactor ?? 2.5, repetitions: state?.repetitions ?? 0 },
      rating,
    );

    await prisma.questionSRSState.upsert({
      where: { userId_questionId: { userId: user.id, questionId } },
      create: { userId: user.id, questionId, ...next },
      update: next,
    });

    return NextResponse.json({ ok: true, nextDueDate: next.dueDate });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
