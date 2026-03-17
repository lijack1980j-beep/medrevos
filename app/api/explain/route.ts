export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';

const schema = z.object({
  stem: z.string().min(1),
  options: z.string().min(1),
  correctAnswer: z.string(),
  selectedAnswer: z.string(),
  explanation: z.string(),
});

export async function POST(request: Request) {
  await requireUser();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { stem, options, correctAnswer, selectedAnswer, explanation } = parsed.data;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a medical education tutor. A student answered this MCQ question.

Question: ${stem}

Options:
${options}

Correct answer: ${correctAnswer}
Student selected: ${selectedAnswer}
Official explanation: ${explanation}

In 3-4 sentences, explain WHY the correct answer is right and why the incorrect options are wrong. Be concise and educational. Focus on the key clinical concept.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ explanation: text });
}