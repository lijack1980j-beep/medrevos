export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getTopicVisibilityWhere } from '@/lib/dbCompat';

const topicSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  system: z.string().min(2),
  summary: z.string().min(10),
  difficulty: z.coerce.number().min(1).max(5),
  estMinutes: z.coerce.number().min(5).max(300)
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const where = await getTopicVisibilityWhere(userId);
  const topics = await prisma.topic.findMany({ where, orderBy: { title: 'asc' } });
  return NextResponse.json(topics);
}

export async function POST(request: Request) {
  try {
    const parsed = topicSchema.parse(await request.json());
    const topic = await prisma.topic.create({
      data: {
        ...parsed,
        lessons: {
          create: {
            title: `${parsed.title} overview`,
            content: 'Add detailed content from the admin panel extension or by direct API call.',
            pearls: 'Add pearls here.',
            pitfalls: 'Add pitfalls here.'
          }
        }
      }
    });
    return NextResponse.json({ message: `Topic ${topic.title} created successfully.`, topic });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create topic.', error: String(error) }, { status: 400 });
  }
}
