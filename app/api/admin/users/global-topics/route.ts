export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getGlobalTopicWhere } from '@/lib/dbCompat';

// ── GET: all topics that are not assigned to any specific user ────────────────
export async function GET() {
  try {
    await requireAdmin();
    const globalTopicWhere = await getGlobalTopicWhere();

    const topics = await prisma.topic.findMany({
      where: globalTopicWhere,
      select: { id: true, title: true, system: true, difficulty: true, estMinutes: true },
      orderBy: [{ system: 'asc' }, { title: 'asc' }],
    });

    return NextResponse.json({ topics });
  } catch (error) {
    const status = String(error).includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: String(error) }, { status });
  }
}
