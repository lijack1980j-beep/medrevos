export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { hasBlockedSectionsColumn } from '@/lib/dbCompat';

export async function GET() {
  await requireAdmin();
  const withBlockedSections = await hasBlockedSectionsColumn();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ...(withBlockedSections ? { blockedSections: true } : {}),
      createdAt: true,
      _count: {
        select: { attempts: true, reviews: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    users: users.map(user => ({ ...user, blockedSections: withBlockedSections ? (user.blockedSections ?? []) : [] })),
  });
}
