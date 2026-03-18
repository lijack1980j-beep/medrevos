export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  role:            z.enum(['STUDENT', 'ADMIN']).optional(),
  blockedSections: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await requireAdmin();

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: params.id },
    data: body.data,
    select: { id: true, name: true, email: true, role: true, blockedSections: true },
  });

  return NextResponse.json({ user });
}
