export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  topicSlug: z.string().min(1),
  cards: z.array(z.object({
    front: z.string().min(1).max(500),
    back: z.string().min(1).max(2000),
  })).min(1).max(30),
});

export async function POST(request: Request) {
  await requireUser();

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { topicSlug, cards } = parsed.data;

  const topic = await prisma.topic.findUnique({ where: { slug: topicSlug } });
  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  await prisma.flashcard.createMany({
    data: cards.map(c => ({
      topicId: topic.id,
      front: c.front,
      back: c.back,
      dueDate: new Date(),
    })),
  });

  return NextResponse.json({ ok: true, count: cards.length });
}