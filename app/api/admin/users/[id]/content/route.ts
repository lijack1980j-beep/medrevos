export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const createTopicSchema = z.object({
  kind:        z.literal('topic'),
  title:       z.string().min(3),
  slug:        z.string().min(3),
  system:      z.string().min(2),
  summary:     z.string().default(''),
  difficulty:  z.coerce.number().min(1).max(5).default(3),
  estMinutes:  z.coerce.number().min(5).max(300).default(20),
  highYield:   z.coerce.boolean().optional(),
});

const deleteSchema = z.object({
  kind: z.enum(['topic', 'exam', 'calendar']),
  id:   z.string().min(1),
});

// ── GET: user's topics, exam history, calendar ────────────────────────────────
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const [topics, examSessions, calEvents] = await Promise.all([
      prisma.topic.findMany({
        where: { assignedToUserId: params.id },
        include: { _count: { select: { lessons: true, questions: true, flashcards: true, cases: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.examSession.findMany({
        where: { userId: params.id },
        include: { answers: { select: { isCorrect: true } } },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }),
      prisma.calendarEvent.findMany({
        where: { userId: params.id },
        orderBy: { dateStr: 'desc' },
      }),
    ]);

    return NextResponse.json({
      topics,
      examSessions: examSessions.map(s => ({
        id:          s.id,
        startedAt:   s.startedAt,
        finishedAt:  s.finishedAt,
        status:      s.status,
        timeLimitSec: s.timeLimitSec,
        totalCount:  s.answers.length,
        correctCount: s.answers.filter(a => a.isCorrect === true).length,
      })),
      calEvents: calEvents.map(e => ({
        id: e.id, type: e.type, title: e.title, dateStr: e.dateStr, note: e.note,
      })),
    });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: String(error) }, { status });
  }
}

// ── POST: create topic assigned to this user ──────────────────────────────────
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.kind === 'topic') {
      const p = createTopicSchema.parse(body);
      await prisma.topic.create({
        data: {
          title: p.title, slug: p.slug, system: p.system,
          summary: p.summary, difficulty: p.difficulty,
          estMinutes: p.estMinutes, highYield: p.highYield ?? false,
          assignedToUserId: params.id,
        },
      });
      return NextResponse.json({ message: `Topic "${p.title}" created.` });
    }

    return NextResponse.json({ message: 'Unsupported kind.' }, { status: 400 });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Failed.', error: String(error) }, { status });
  }
}

// ── DELETE: remove topic / exam session / calendar event ──────────────────────
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await request.json();
    const p = deleteSchema.parse(body);

    if (p.kind === 'topic') {
      await prisma.topic.deleteMany({ where: { id: p.id, assignedToUserId: params.id } });
    }
    if (p.kind === 'exam') {
      await prisma.examSession.deleteMany({ where: { id: p.id, userId: params.id } });
    }
    if (p.kind === 'calendar') {
      await prisma.calendarEvent.deleteMany({ where: { id: p.id, userId: params.id } });
    }

    return NextResponse.json({ message: 'Deleted.' });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Delete failed.', error: String(error) }, { status });
  }
}
