import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topicId');
  if (!topicId) return NextResponse.json({ content: '' });

  const note = await prisma.topicNote.findUnique({
    where: { userId_topicId: { userId: user.id, topicId } },
  });
  return NextResponse.json({ content: note?.content ?? '' });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const { topicId, content } = await request.json();
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });

  await prisma.topicNote.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: { userId: user.id, topicId, content: content ?? '' },
    update: { content: content ?? '' },
  });
  return NextResponse.json({ ok: true });
}
