export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const topicSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  system: z.string().min(2),
  summary: z.string().min(10),
  difficulty: z.coerce.number().min(1).max(5),
  estMinutes: z.coerce.number().min(5).max(300)
});

export async function GET() {
  const topics = await prisma.topic.findMany({ orderBy: { title: 'asc' } });
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