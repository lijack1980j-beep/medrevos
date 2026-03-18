export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

const createSchema = z.object({
  type:    z.enum(['EVENT', 'EXAM', 'NOTE']),
  title:   z.string().min(1).max(200),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note:    z.string().max(1000).nullable().optional(),
  color:   z.string().max(20).nullable().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id },
    orderBy: { dateStr: 'asc' },
  });
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = createSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { type, title, dateStr, note, color } = body.data;
  const event = await prisma.calendarEvent.create({
    data: { userId: user.id, type, title, dateStr, note: note ?? null, color: color ?? null },
  });
  return NextResponse.json({ event });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await prisma.calendarEvent.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
