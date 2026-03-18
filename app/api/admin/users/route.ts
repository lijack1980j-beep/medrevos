export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      blockedSections: true,
      createdAt: true,
      _count: {
        select: { attempts: true, reviews: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}
