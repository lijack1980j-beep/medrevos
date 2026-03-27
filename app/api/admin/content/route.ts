export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getGlobalTopicWhere, hasTopicAssignmentsColumn } from '@/lib/dbCompat';

const questionLabels = ['A', 'B', 'C', 'D'] as const;

const topicSchema        = z.object({ kind: z.literal('topic'), title: z.string().min(1), slug: z.string().min(1), system: z.string().min(1), summary: z.string().default(''), difficulty: z.coerce.number().min(1).max(5), estMinutes: z.coerce.number().min(1).max(300), highYield: z.coerce.boolean().optional() });
const topicEditSchema    = z.object({ id: z.string().min(1), title: z.string().min(1), slug: z.string().min(1), system: z.string().min(1), summary: z.string().default(''), difficulty: z.coerce.number().min(1).max(5), estMinutes: z.coerce.number().min(1).max(300), highYield: z.coerce.boolean().optional() });
const lessonSchema       = z.object({ kind: z.literal('lesson'), topicId: z.string().min(1), title: z.string().min(1), content: z.string().min(1), pearls: z.string().default(''), pitfalls: z.string().default('') });
const lessonEditSchema   = z.object({ kind: z.literal('lesson'), id: z.string().min(1), title: z.string().min(1), content: z.string().min(1), pearls: z.string().default(''), pitfalls: z.string().default('') });
const flashcardSchema    = z.object({ kind: z.literal('flashcard'), topicId: z.string().min(1), front: z.string().min(1), back: z.string().min(1), note: z.string().optional().nullable() });
const flashcardEditSchema = z.object({ kind: z.literal('flashcard'), id: z.string().min(1), front: z.string().min(1), back: z.string().min(1), note: z.string().optional().nullable() });
const questionSchema     = z.object({ kind: z.literal('question'), topicId: z.string().min(1), stem: z.string().min(1), explanation: z.string().min(1), difficulty: z.coerce.number().min(1).max(5), optionA: z.string().min(1), optionB: z.string().min(1), optionC: z.string().min(1), optionD: z.string().min(1), correctLabel: z.enum(['A', 'B', 'C', 'D']) });
const questionEditSchema = z.object({ kind: z.literal('question'), id: z.string().min(1), stem: z.string().min(1), explanation: z.string().min(1), difficulty: z.coerce.number().min(1).max(5), optionA: z.string().min(1), optionB: z.string().min(1), optionC: z.string().min(1), optionD: z.string().min(1), correctLabel: z.enum(['A', 'B', 'C', 'D']) });
const caseSchema         = z.object({ kind: z.literal('case'), topicId: z.string().min(1), title: z.string().min(1), chiefComplaint: z.string().min(1), findings: z.string().min(1), investigations: z.string().min(1), diagnosis: z.string().min(1), management: z.string().min(1) });
const caseEditSchema     = z.object({ kind: z.literal('case'), id: z.string().min(1), title: z.string().min(1), chiefComplaint: z.string().min(1), findings: z.string().min(1), investigations: z.string().min(1), diagnosis: z.string().min(1), management: z.string().min(1) });
const deleteSchema       = z.object({ kind: z.enum(['topic', 'lesson', 'flashcard', 'question', 'case']), id: z.string().min(1) });
const importJsonSchema   = z.object({
  kind: z.literal('import-json'),
  contentKind: z.enum(['lesson', 'flashcard', 'question']),
  topicId: z.string().min(1),
  items: z.array(z.unknown()).min(1),
});

const importedLessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  pearls: z.string().optional().nullable(),
  pitfalls: z.string().optional().nullable(),
});

const importedFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  note: z.string().optional().nullable(),
});

const importedQuestionSchema = z.object({
  stem: z.string().min(1),
  explanation: z.string().optional().nullable(),
  difficulty: z.coerce.number().min(1).max(5).optional(),
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctLabel: z.enum(questionLabels).optional(),
  correctOption: z.enum(questionLabels).optional(),
  answer: z.enum(questionLabels).optional(),
  correctAnswer: z.string().optional(),
  options: z.array(z.object({
    label: z.string().optional(),
    text: z.string().min(1),
    isCorrect: z.boolean().optional(),
  })).length(4).optional(),
});

function normalizeImportedQuestion(raw: unknown) {
  const parsed = importedQuestionSchema.parse(raw);
  const optionMap: Partial<Record<typeof questionLabels[number], string>> = {};

  if (parsed.options) {
    parsed.options.forEach((option, index) => {
      const fallback = questionLabels[index];
      const label = (option.label?.trim().toUpperCase() || fallback) as typeof questionLabels[number];
      if (questionLabels.includes(label)) optionMap[label] = option.text;
    });
  }

  if (parsed.optionA) optionMap.A = parsed.optionA;
  if (parsed.optionB) optionMap.B = parsed.optionB;
  if (parsed.optionC) optionMap.C = parsed.optionC;
  if (parsed.optionD) optionMap.D = parsed.optionD;

  for (const label of questionLabels) {
    if (!optionMap[label]?.trim()) {
      throw new Error(`Question "${parsed.stem.slice(0, 40)}" is missing option ${label}.`);
    }
  }

  const correctLabel =
    parsed.correctLabel ??
    parsed.correctOption ??
    parsed.answer ??
    (parsed.options?.find(option => option.isCorrect)?.label?.trim().toUpperCase() as typeof questionLabels[number] | undefined) ??
    questionLabels.find(label => optionMap[label] === parsed.correctAnswer?.trim());

  if (!correctLabel || !questionLabels.includes(correctLabel)) {
    throw new Error(`Question "${parsed.stem.slice(0, 40)}" is missing a valid correct answer.`);
  }

  return {
    stem: parsed.stem,
    explanation: parsed.explanation ?? '',
    difficulty: parsed.difficulty ?? 3,
    optionA: optionMap.A!,
    optionB: optionMap.B!,
    optionC: optionMap.C!,
    optionD: optionMap.D!,
    correctLabel,
  };
}

// ── GET: list content by type ─────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const type       = searchParams.get('type');
    const topicId    = searchParams.get('topicId') ?? undefined;
    const globalOnly = searchParams.get('globalOnly') === 'true';
    const topicFilter = globalOnly ? await getGlobalTopicWhere() : {};
    const withAssignments = await hasTopicAssignmentsColumn();

    if (type === 'lesson') {
      const rows = await prisma.lesson.findMany({
        where: topicId ? { topicId } : (globalOnly ? { topic: topicFilter } : {}),
        include: { topic: { select: { id: true, title: true, ...(withAssignments ? { assignedToUserId: true } : {}) } } },
        orderBy: [{ topic: { title: 'asc' } }, { title: 'asc' }],
      });
      return NextResponse.json({ items: rows.map(l => ({ id: l.id, title: l.title, content: l.content, pearls: l.pearls, pitfalls: l.pitfalls, topicId: l.topicId, topicTitle: l.topic.title, isGlobal: withAssignments ? l.topic.assignedToUserId === null : true, createdAt: l.createdAt })) });
    }

    if (type === 'question') {
      const rows = await prisma.question.findMany({
        where: topicId ? { topicId } : (globalOnly ? { topic: topicFilter } : {}),
        include: { topic: { select: { id: true, title: true, ...(withAssignments ? { assignedToUserId: true } : {}) } }, options: true },
        orderBy: [{ topic: { title: 'asc' } }, { createdAt: 'desc' }],
      });
      return NextResponse.json({ items: rows.map(q => ({ id: q.id, stem: q.stem, explanation: q.explanation, difficulty: q.difficulty, correctOptionId: q.correctOptionId, options: q.options, topicId: q.topicId, topicTitle: q.topic.title, isGlobal: withAssignments ? q.topic.assignedToUserId === null : true, createdAt: q.createdAt })) });
    }

    if (type === 'flashcard') {
      const rows = await prisma.flashcard.findMany({
        where: topicId ? { topicId } : (globalOnly ? { topic: topicFilter } : {}),
        include: { topic: { select: { id: true, title: true, ...(withAssignments ? { assignedToUserId: true } : {}) } } },
        orderBy: [{ topic: { title: 'asc' } }, { createdAt: 'desc' }],
      });
      return NextResponse.json({ items: rows.map(f => ({ id: f.id, front: f.front, back: f.back, note: f.note, topicId: f.topicId, topicTitle: f.topic.title, isGlobal: withAssignments ? f.topic.assignedToUserId === null : true, createdAt: f.createdAt })) });
    }

    if (type === 'case') {
      const rows = await prisma.caseStudy.findMany({
        where: topicId ? { topicId } : (globalOnly ? { topic: topicFilter } : {}),
        include: { topic: { select: { id: true, title: true, ...(withAssignments ? { assignedToUserId: true } : {}) } } },
        orderBy: [{ topic: { title: 'asc' } }, { title: 'asc' }],
      });
      return NextResponse.json({ items: rows.map(c => ({ id: c.id, title: c.title, chiefComplaint: c.chiefComplaint, findings: c.findings, investigations: c.investigations, diagnosis: c.diagnosis, management: c.management, topicId: c.topicId, topicTitle: c.topic.title, isGlobal: withAssignments ? c.topic.assignedToUserId === null : true, createdAt: c.createdAt })) });
    }

    return NextResponse.json({ message: 'Invalid type.' }, { status: 400 });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Fetch failed.', error: String(error) }, { status });
  }
}

// ── POST: create content ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.kind === 'topic') {
      const p = topicSchema.parse(body);
      await prisma.topic.create({ data: { title: p.title, slug: p.slug, system: p.system, summary: p.summary, difficulty: p.difficulty, estMinutes: p.estMinutes, highYield: p.highYield ?? false } });
      return NextResponse.json({ message: `Topic "${p.title}" created.` });
    }
    if (body.kind === 'lesson') {
      const p = lessonSchema.parse(body);
      await prisma.lesson.create({ data: { topicId: p.topicId, title: p.title, content: p.content, pearls: p.pearls, pitfalls: p.pitfalls } });
      return NextResponse.json({ message: `Lesson "${p.title}" created.` });
    }
    if (body.kind === 'flashcard') {
      const p = flashcardSchema.parse(body);
      await prisma.flashcard.create({ data: { topicId: p.topicId, front: p.front, back: p.back, note: p.note || null } });
      return NextResponse.json({ message: 'Flashcard created.' });
    }
    if (body.kind === 'question') {
      const p = questionSchema.parse(body);
      const created = await prisma.question.create({
        data: {
          topicId: p.topicId, stem: p.stem, explanation: p.explanation, difficulty: p.difficulty,
          options: { create: [
            { label: 'A', text: p.optionA, isCorrect: p.correctLabel === 'A' },
            { label: 'B', text: p.optionB, isCorrect: p.correctLabel === 'B' },
            { label: 'C', text: p.optionC, isCorrect: p.correctLabel === 'C' },
            { label: 'D', text: p.optionD, isCorrect: p.correctLabel === 'D' },
          ] },
        },
        include: { options: true },
      });
      const correct = created.options.find(o => o.isCorrect);
      if (correct) await prisma.question.update({ where: { id: created.id }, data: { correctOptionId: correct.id } });
      return NextResponse.json({ message: 'Question created.' });
    }
    if (body.kind === 'import-json') {
      const p = importJsonSchema.parse(body);

      if (p.contentKind === 'lesson') {
        const lessons = p.items.map(item => importedLessonSchema.parse(item));
        await prisma.lesson.createMany({
          data: lessons.map(item => ({
            topicId: p.topicId,
            title: item.title,
            content: item.content,
            pearls: item.pearls ?? '',
            pitfalls: item.pitfalls ?? '',
          })),
        });
        return NextResponse.json({ message: `Imported ${lessons.length} lesson${lessons.length !== 1 ? 's' : ''}.` });
      }

      if (p.contentKind === 'flashcard') {
        const flashcards = p.items.map(item => importedFlashcardSchema.parse(item));
        await prisma.flashcard.createMany({
          data: flashcards.map(item => ({
            topicId: p.topicId,
            front: item.front,
            back: item.back,
            note: item.note ?? null,
          })),
        });
        return NextResponse.json({ message: `Imported ${flashcards.length} flashcard${flashcards.length !== 1 ? 's' : ''}.` });
      }

      const questions = p.items.map(item => normalizeImportedQuestion(item));
      await prisma.$transaction(async tx => {
        for (const question of questions) {
          const created = await tx.question.create({
            data: {
              topicId: p.topicId,
              stem: question.stem,
              explanation: question.explanation,
              difficulty: question.difficulty,
              options: {
                create: [
                  { label: 'A', text: question.optionA, isCorrect: question.correctLabel === 'A' },
                  { label: 'B', text: question.optionB, isCorrect: question.correctLabel === 'B' },
                  { label: 'C', text: question.optionC, isCorrect: question.correctLabel === 'C' },
                  { label: 'D', text: question.optionD, isCorrect: question.correctLabel === 'D' },
                ],
              },
            },
            include: { options: true },
          });

          const correct = created.options.find(option => option.isCorrect);
          if (correct) {
            await tx.question.update({
              where: { id: created.id },
              data: { correctOptionId: correct.id },
            });
          }
        }
      });
      return NextResponse.json({ message: `Imported ${questions.length} question${questions.length !== 1 ? 's' : ''}.` });
    }
    if (body.kind === 'case') {
      const p = caseSchema.parse(body);
      await prisma.caseStudy.create({ data: { topicId: p.topicId, title: p.title, chiefComplaint: p.chiefComplaint, findings: p.findings, investigations: p.investigations, diagnosis: p.diagnosis, management: p.management } });
      return NextResponse.json({ message: `Case "${p.title}" created.` });
    }
    return NextResponse.json({ message: 'Unsupported kind.' }, { status: 400 });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Create failed.', error: String(error) }, { status });
  }
}

// ── PATCH: edit content ───────────────────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.kind === 'lesson') {
      const p = lessonEditSchema.parse(body);
      await prisma.lesson.update({ where: { id: p.id }, data: { title: p.title, content: p.content, pearls: p.pearls, pitfalls: p.pitfalls } });
      return NextResponse.json({ message: 'Lesson updated.' });
    }

    if (body.kind === 'flashcard') {
      const p = flashcardEditSchema.parse(body);
      await prisma.flashcard.update({ where: { id: p.id }, data: { front: p.front, back: p.back, note: p.note || null } });
      return NextResponse.json({ message: 'Flashcard updated.' });
    }

    if (body.kind === 'question') {
      const p = questionEditSchema.parse(body);
      const question = await prisma.question.findUnique({ where: { id: p.id }, include: { options: true } });
      if (!question) return NextResponse.json({ message: 'Question not found.' }, { status: 404 });

      const optionTexts: Record<string, string> = { A: p.optionA, B: p.optionB, C: p.optionC, D: p.optionD };
      await prisma.question.update({ where: { id: p.id }, data: { stem: p.stem, explanation: p.explanation, difficulty: p.difficulty } });
      for (const opt of question.options) {
        await prisma.questionOption.update({ where: { id: opt.id }, data: { text: optionTexts[opt.label], isCorrect: opt.label === p.correctLabel } });
      }
      const correctOpt = question.options.find(o => o.label === p.correctLabel);
      if (correctOpt) await prisma.question.update({ where: { id: p.id }, data: { correctOptionId: correctOpt.id } });
      return NextResponse.json({ message: 'Question updated.' });
    }

    if (body.kind === 'case') {
      const p = caseEditSchema.parse(body);
      await prisma.caseStudy.update({ where: { id: p.id }, data: { title: p.title, chiefComplaint: p.chiefComplaint, findings: p.findings, investigations: p.investigations, diagnosis: p.diagnosis, management: p.management } });
      return NextResponse.json({ message: 'Case updated.' });
    }

    // Topic edit (no kind field — legacy path)
    const p = topicEditSchema.parse(body);
    await prisma.topic.update({ where: { id: p.id }, data: { title: p.title, slug: p.slug, system: p.system, summary: p.summary, difficulty: p.difficulty, estMinutes: p.estMinutes, highYield: p.highYield ?? false } });
    return NextResponse.json({ message: `Topic "${p.title}" updated.` });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Update failed.', error: String(error) }, { status });
  }
}

// ── DELETE: remove content ────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const p = deleteSchema.parse(body);
    if (p.kind === 'topic')     await prisma.topic.delete({ where: { id: p.id } });
    if (p.kind === 'lesson')    await prisma.lesson.delete({ where: { id: p.id } });
    if (p.kind === 'flashcard') await prisma.flashcard.delete({ where: { id: p.id } });
    if (p.kind === 'question')  await prisma.question.delete({ where: { id: p.id } });
    if (p.kind === 'case')      await prisma.caseStudy.delete({ where: { id: p.id } });
    return NextResponse.json({ message: `${p.kind.charAt(0).toUpperCase() + p.kind.slice(1)} deleted.` });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ message: 'Delete failed.', error: String(error) }, { status });
  }
}
