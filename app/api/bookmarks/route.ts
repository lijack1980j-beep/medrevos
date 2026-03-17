export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET() {
  const user = await requireUser();
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    select: { questionId: true },
  });
  return NextResponse.json(bookmarks.map(b => b.questionId));
}

export async function POST(request: Request) {
  const user = await requireUser();
  const { questionId } = await request.json();
  if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 });

  const existing = await prisma.bookmark.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }
  await prisma.bookmark.create({ data: { userId: user.id, questionId } });
  return NextResponse.json({ bookmarked: true });
}