export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { requireUser } = await import('@/lib/auth');
    const user = await requireUser();
    const flashcards = await prisma.flashcard.findMany({
      where: { topic: { OR: [{ assignedToUserId: null as string | null }, { assignedToUserId: user.id }] } },
      include: { topic: true },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(flashcards);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
