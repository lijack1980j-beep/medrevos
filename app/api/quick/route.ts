export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  prompt: z.string().min(2, 'Prompt must be at least 2 characters').max(20000),
  count: z.coerce.number().int().min(3).max(20).optional().default(10),
});

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on this server.' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { prompt, count } = parsed.data;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      tools: [
        {
          name: 'save_cards',
          description: 'Save a set of quick-study flashcards',
          input_schema: {
            type: 'object' as const,
            properties: {
              cards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    front: { type: 'string', description: 'Concise question or concept (max 140 chars)' },
                    back:  { type: 'string', description: 'Clear answer or explanation (max 260 chars)' },
                  },
                  required: ['front', 'back'],
                  additionalProperties: false,
                },
                minItems: 3,
                maxItems: 20,
              },
            },
            required: ['cards'],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Generate exactly ${count} high-yield flashcards for medical students on the topic: "${prompt}".

Rules:
- Each card tests one fact, mechanism, or clinical pearl
- Front: a clear question or incomplete statement
- Back: concise, accurate answer — include key values, percentages, or mnemonics where useful
- Prioritise testable, board-relevant content`,
        },
      ],
    });

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolUse) {
      return NextResponse.json({ error: 'AI did not return structured content. Please try again.' }, { status: 500 });
    }

    const { cards } = toolUse.input as { cards: { front: string; back: string }[] };
    return NextResponse.json({ cards });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Invalid Anthropic API key.' }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'API rate limit reached. Please try again shortly.' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `API error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }
}