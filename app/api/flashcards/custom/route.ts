export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

const createSchema = z.object({
  topicId: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  note: z.string().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());
    const card = await prisma.flashcard.create({
      data: { ...body, note: body.note ?? null, isCustom: true, authorId: user.id },
    });
    return NextResponse.json(card);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { id } = deleteSchema.parse(await request.json());
    const card = await prisma.flashcard.findUnique({ where: { id } });
    if (!card || card.authorId !== user.id)
      return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 });
    await prisma.flashcard.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
