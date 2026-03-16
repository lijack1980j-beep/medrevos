import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function PATCH(request: Request) {
  const user = await requireUser();
  const { examDate } = await request.json();
  const date = examDate ? new Date(examDate) : null;
  if (examDate && isNaN(date!.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { examDate: date } });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await requireUser();
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { examDate: true } });
  return NextResponse.json({ examDate: u?.examDate ?? null });
}
