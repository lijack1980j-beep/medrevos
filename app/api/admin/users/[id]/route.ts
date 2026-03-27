export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { hasBlockedSectionsColumn } from '@/lib/dbCompat';

const schema = z.object({
  role:            z.enum(['STUDENT', 'ADMIN']).optional(),
  blockedSections: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const withBlockedSections = await hasBlockedSectionsColumn();

    const body = schema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const data = { ...body.data };
    if (!withBlockedSections) delete data.blockedSections;

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ...(withBlockedSections ? { blockedSections: true } : {}),
      },
    });

    return NextResponse.json({ user: { ...user, blockedSections: withBlockedSections ? (user.blockedSections ?? []) : [] } });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403
      : String(error).includes('Record to update not found') ? 404
      : 500;
    return NextResponse.json({ error: String(error) }, { status });
  }
}
