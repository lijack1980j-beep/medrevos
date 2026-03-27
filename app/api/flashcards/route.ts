export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTopicVisibilityWhere } from '@/lib/dbCompat';

export async function GET(request: Request) {
  try {
    const { requireUser } = await import('@/lib/auth');
    const user = await requireUser();
    const topicVisibilityWhere = await getTopicVisibilityWhere(user.id);
    const flashcards = await prisma.flashcard.findMany({
      where: { topic: topicVisibilityWhere },
      include: { topic: true },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(flashcards);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
