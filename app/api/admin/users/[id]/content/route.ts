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

const patchSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('assign-topic'),   topicId: z.string().min(1) }),
  z.object({ kind: z.literal('unassign-topic'), topicId: z.string().min(1) }),
]);

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

    // ── Import (copy) content from any topic into one of the user's topics ──────
    if (body.kind === 'import') {
      const fromTopicId = z.string().min(1).parse(body.fromTopicId);
      const toTopicId   = z.string().min(1).parse(body.toTopicId);
      const types: string[] = Array.isArray(body.types)
        ? body.types
        : ['lesson', 'question', 'flashcard', 'case'];

      // Verify destination topic belongs to this user (either assigned OR null for global admins)
      const dest = await prisma.topic.findFirst({
        where: { id: toTopicId, assignedToUserId: params.id },
      });
      if (!dest) {
        // Also allow import INTO a global topic if the admin just wants to copy content
        const globalDest = await prisma.topic.findFirst({ where: { id: toTopicId, assignedToUserId: null } });
        if (!globalDest) {
          return NextResponse.json(
            { message: `Destination topic not found. toTopicId=${toTopicId} userId=${params.id}` },
            { status: 404 },
          );
        }
      }
      const targetTopic = dest ?? (await prisma.topic.findFirst({ where: { id: toTopicId } }))!;

      let imported = 0;

      if (types.includes('lesson')) {
        const lessons = await prisma.lesson.findMany({ where: { topicId: fromTopicId } });
        if (lessons.length) {
          await prisma.lesson.createMany({
            data: lessons.map(l => ({ topicId: toTopicId, title: l.title, content: l.content, pearls: l.pearls, pitfalls: l.pitfalls })),
          });
          imported += lessons.length;
        }
      }

      if (types.includes('flashcard')) {
        const cards = await prisma.flashcard.findMany({ where: { topicId: fromTopicId } });
        if (cards.length) {
          await prisma.flashcard.createMany({
            data: cards.map(c => ({ topicId: toTopicId, front: c.front, back: c.back, note: c.note })),
          });
          imported += cards.length;
        }
      }

      if (types.includes('case')) {
        const cases = await prisma.caseStudy.findMany({ where: { topicId: fromTopicId } });
        if (cases.length) {
          await prisma.caseStudy.createMany({
            data: cases.map(c => ({ topicId: toTopicId, title: c.title, chiefComplaint: c.chiefComplaint, findings: c.findings, investigations: c.investigations, diagnosis: c.diagnosis, management: c.management })),
          });
          imported += cases.length;
        }
      }

      if (types.includes('question')) {
        const questions = await prisma.question.findMany({
          where: { topicId: fromTopicId },
          include: { options: true },
        });
        for (const q of questions) {
          const created = await prisma.question.create({
            data: {
              topicId: toTopicId, stem: q.stem, explanation: q.explanation, difficulty: q.difficulty,
              options: { create: q.options.map(o => ({ label: o.label, text: o.text, isCorrect: o.isCorrect })) },
            },
            include: { options: true },
          });
          const correct = created.options.find(o => o.isCorrect);
          if (correct) await prisma.question.update({ where: { id: created.id }, data: { correctOptionId: correct.id } });
          imported++;
        }
      }

      return NextResponse.json({ message: `Imported ${imported} item${imported !== 1 ? 's' : ''} into "${targetTopic.title}".` });
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
      // Verify ownership before deleting so we surface a real error if not found
      const topic = await prisma.topic.findFirst({
        where: { id: p.id, assignedToUserId: params.id },
      });
      if (!topic) {
        return NextResponse.json(
          { message: `Topic not found or does not belong to this user. topicId=${p.id} userId=${params.id}` },
          { status: 404 },
        );
      }
      // Delete by id only — ownership already verified above
      await prisma.topic.delete({ where: { id: p.id } });
    }

    if (p.kind === 'exam') {
      const session = await prisma.examSession.findFirst({ where: { id: p.id, userId: params.id } });
      if (!session) return NextResponse.json({ message: 'Exam session not found.' }, { status: 404 });
      await prisma.examSession.delete({ where: { id: p.id } });
    }

    if (p.kind === 'calendar') {
      const event = await prisma.calendarEvent.findFirst({ where: { id: p.id, userId: params.id } });
      if (!event) return NextResponse.json({ message: 'Calendar event not found.' }, { status: 404 });
      await prisma.calendarEvent.delete({ where: { id: p.id } });
    }

    return NextResponse.json({ message: 'Deleted.' });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ message: 'Delete failed.', error: String(error) }, { status });
  }
}

// ── PATCH: assign or unassign a topic to/from this user ───────────────────────
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await request.json();
    const p    = patchSchema.parse(body);

    if (p.kind === 'assign-topic') {
      // Verify topic exists and is currently global (assignedToUserId null)
      const topic = await prisma.topic.findFirst({ where: { id: p.topicId, assignedToUserId: null } });
      if (!topic) return NextResponse.json({ message: 'Topic not found or already assigned.' }, { status: 404 });
      await prisma.topic.update({ where: { id: p.topicId }, data: { assignedToUserId: params.id } });
      return NextResponse.json({ message: `Topic "${topic.title}" assigned to user.` });
    }

    if (p.kind === 'unassign-topic') {
      // Make the topic global again (visible to all)
      await prisma.topic.updateMany({
        where: { id: p.topicId, assignedToUserId: params.id },
        data: { assignedToUserId: null },
      });
      return NextResponse.json({ message: 'Topic unassigned — now visible to all students.' });
    }

    return NextResponse.json({ message: 'Unsupported kind.' }, { status: 400 });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Patch failed.', error: String(error) }, { status });
  }
}
