import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { nextReview } from '@/lib/spacedRepetition';
import { requireUser } from '@/lib/auth';

const reviewSchema = z.object({ flashcardId: z.string().min(1), rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { flashcardId, rating } = reviewSchema.parse(await request.json());
    const card = await prisma.flashcard.findUnique({ where: { id: flashcardId } });
    if (!card) return NextResponse.json({ message: 'Flashcard not found.' }, { status: 404 });

    const state = await prisma.userFlashcardState.findUnique({ where: { userId_flashcardId: { userId: user.id, flashcardId } } });
    const next = nextReview({ intervalDays: state?.intervalDays ?? 0, easeFactor: state?.easeFactor ?? 2.5, repetitions: state?.repetitions ?? 0 }, rating);

    await prisma.userFlashcardState.upsert({
      where: { userId_flashcardId: { userId: user.id, flashcardId } },
      create: { userId: user.id, flashcardId, intervalDays: next.intervalDays, easeFactor: next.easeFactor, repetitions: next.repetitions, dueDate: next.dueDate },
      update: { intervalDays: next.intervalDays, easeFactor: next.easeFactor, repetitions: next.repetitions, dueDate: next.dueDate }
    });

    await prisma.flashcardReview.create({ data: { userId: user.id, flashcardId, rating, nextDueDate: next.dueDate } });

    return NextResponse.json({ ok: true, nextDueDate: next.dueDate });
  } catch (error) {
    const status = String(error).includes('UNAUTHORIZED') ? 401 : 400;
    return NextResponse.json({ message: 'Review failed.', error: String(error) }, { status });
  }
}
