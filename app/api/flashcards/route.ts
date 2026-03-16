export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const flashcards = await prisma.flashcard.findMany({ include: { topic: true }, orderBy: { dueDate: 'asc' } });
  return NextResponse.json(flashcards);
}
