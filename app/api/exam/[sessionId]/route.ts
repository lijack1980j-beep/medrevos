import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const user = await requireUser();
  const session = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        include: {
          question: {
            include: {
              options: { orderBy: { label: 'asc' } },
              topic: { select: { title: true, system: true } },
            },
          },
        },
      },
    },
  });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PATCH(request: Request, { params }: { params: { sessionId: string } }) {
  const user = await requireUser();
  const session = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: { answers: { include: { question: { include: { options: true } } } } },
  });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { answers } = await request.json() as { answers: Record<string, string> };

  // Score and save each answer
  for (const answer of session.answers) {
    const selected = answers[answer.questionId] ?? null;
    const correct = answer.question.options.find(o => o.isCorrect);
    const isCorrect = selected ? selected === correct?.id : false;
    await prisma.examAnswer.update({
      where: { id: answer.id },
      data: { selected, isCorrect },
    });
    // Also record as a QuestionAttempt for analytics
    if (selected) {
      await prisma.questionAttempt.create({
        data: { userId: user.id, questionId: answer.questionId, selected, isCorrect },
      });
    }
  }

  await prisma.examSession.update({
    where: { id: params.sessionId },
    data: { status: 'COMPLETED', finishedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
