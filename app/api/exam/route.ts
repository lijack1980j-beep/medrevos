export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getTopicVisibilityWhere } from '@/lib/dbCompat';

const createSchema = z.object({
  topicIds:    z.array(z.string()).optional(),
  count:       z.number().int().min(5).max(80),
  timeLimitSec: z.number().int().min(0),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const { topicIds, count, timeLimitSec } = createSchema.parse(body);

  const userFilter = await getTopicVisibilityWhere(user.id);
  const questions = await prisma.question.findMany({
    where: topicIds?.length
      ? { topicId: { in: topicIds }, topic: userFilter }
      : { topic: userFilter },
    include: {
      options: { select: { id: true, label: true, text: true }, orderBy: { label: 'asc' } },
      topic:   { select: { title: true, system: true } },
    },
  });

  // Shuffle and slice
  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, count);
  if (shuffled.length === 0) {
    return NextResponse.json({ error: 'No questions found for the selected criteria.' }, { status: 400 });
  }

  const session = await prisma.examSession.create({
    data: {
      userId: user.id,
      timeLimitSec,
      answers: {
        create: shuffled.map(q => ({ questionId: q.id })),
      },
    },
  });

  return NextResponse.json({ sessionId: session.id, questions: shuffled });
}
