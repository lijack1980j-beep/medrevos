export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';

const schema = z.object({
  topic: z.string().min(1),
  concept: z.string().min(1),
});

export async function POST(request: Request) {
  await requireUser();
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { topic, concept } = parsed.data;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Create a memorable medical mnemonic for a student studying "${concept}" in the topic of "${topic}".
Return ONLY:
1. The mnemonic acronym or phrase (bold it with **)
2. What each letter/word stands for
3. One sentence memory tip

Be creative, clinically relevant, and easy to remember.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ mnemonic: text });
}
