export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// ── GET: export full content pack for a user ──────────────────────────────────
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const topics = await prisma.topic.findMany({
      where: { assignedToUserId: params.id },
      include: {
        lessons: {
          select: { id: true, title: true, content: true, pearls: true, pitfalls: true, createdAt: true },
        },
        questions: {
          include: { options: { select: { label: true, text: true, isCorrect: true } } },
        },
        flashcards: {
          select: { id: true, front: true, back: true, note: true, createdAt: true },
        },
        cases: {
          select: { id: true, title: true, chiefComplaint: true, findings: true, investigations: true, diagnosis: true, management: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const examSessions = await prisma.examSession.findMany({
      where: { userId: params.id },
      include: {
        answers: { select: { isCorrect: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const calEvents = await prisma.calendarEvent.findMany({
      where: { userId: params.id },
      orderBy: { dateStr: 'desc' },
    });

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      user: { id: user.id, name: user.name, email: user.email },
      topics: topics.map(t => ({
        id: t.id, title: t.title, slug: t.slug, system: t.system,
        summary: t.summary, difficulty: t.difficulty, estMinutes: t.estMinutes,
        lessons: t.lessons,
        questions: t.questions.map(q => ({
          id: q.id, stem: q.stem, explanation: q.explanation, difficulty: q.difficulty,
          options: q.options,
        })),
        flashcards: t.flashcards,
        cases: t.cases,
      })),
      examHistory: examSessions.map(s => ({
        id: s.id,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        status: s.status,
        totalQuestions: s.answers.length,
        correctAnswers: s.answers.filter(a => a.isCorrect === true).length,
      })),
      calendarEvents: calEvents.map(e => ({
        id: e.id, type: e.type, title: e.title, dateStr: e.dateStr, note: e.note,
      })),
    });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: String(error) }, { status });
  }
}
