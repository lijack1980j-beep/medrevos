import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';

const requestSchema = z.object({
  text: z.string().min(50, 'Text must be at least 50 characters').max(20000, 'Text must be under 20,000 characters'),
  flashcardCount: z.number().int().min(0).max(20),
  questionCount: z.number().int().min(0).max(10),
});

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { text, flashcardCount, questionCount } = parsed.data;

  if (flashcardCount === 0 && questionCount === 0) {
    return NextResponse.json({ error: 'Select at least one flashcard or question to generate.' }, { status: 400 });
  }

  const tool: Anthropic.Tool = {
    name: 'create_study_content',
    description: 'Creates structured flashcards and MCQ questions from source text for a medical revision platform.',
    input_schema: {
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          description: `Generate exactly ${flashcardCount} high-yield flashcards. If flashcardCount is 0, return an empty array.`,
          items: {
            type: 'object',
            properties: {
              front: { type: 'string', description: 'Concise question or prompt (max 150 chars)' },
              back: { type: 'string', description: 'Precise, complete answer (max 250 chars)' },
              note: { type: 'string', description: 'Optional short clinical pearl or mnemonic (max 120 chars). Omit if not useful.' },
            },
            required: ['front', 'back'],
            additionalProperties: false,
          },
        },
        questions: {
          type: 'array',
          description: `Generate exactly ${questionCount} single-best-answer MCQs. If questionCount is 0, return an empty array.`,
          items: {
            type: 'object',
            properties: {
              stem: { type: 'string', description: 'Clinical scenario or question stem (2-4 sentences, ending with a question)' },
              explanation: { type: 'string', description: 'Explanation of the correct answer and why distractors are wrong (2-4 sentences)' },
              difficulty: { type: 'number', description: 'Difficulty 1–5 (1=recall, 3=application, 5=complex reasoning)' },
              options: {
                type: 'array',
                description: 'Exactly 4 options labeled A, B, C, D. Exactly one must have isCorrect=true.',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                    text: { type: 'string', description: 'Option text (max 100 chars)' },
                    isCorrect: { type: 'boolean' },
                  },
                  required: ['label', 'text', 'isCorrect'],
                  additionalProperties: false,
                },
              },
            },
            required: ['stem', 'explanation', 'difficulty', 'options'],
            additionalProperties: false,
          },
        },
      },
      required: ['flashcards', 'questions'],
      additionalProperties: false,
    },
  };

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      tools: [tool],
      tool_choice: { type: 'any' },
      system: `You are a medical education expert creating high-yield study content for medical students and doctors.
Generate precise, clinically accurate content derived strictly from the provided source text.

Guidelines:
- Flashcards: concise front (question/prompt) and back (answer) pairs. Target key facts, mechanisms, clinical presentations, investigations, and management steps.
- Questions: USMLE-style single-best-answer MCQs with realistic clinical vignettes. Each must have exactly 4 options (A–D) with exactly one correct answer.
- All content must be directly grounded in the source text — do not introduce external information.
- Vary difficulty: 1=recall, 3=application, 5=complex reasoning.`,
      messages: [
        {
          role: 'user',
          content: `Generate ${flashcardCount} flashcard${flashcardCount !== 1 ? 's' : ''} and ${questionCount} MCQ question${questionCount !== 1 ? 's' : ''} from this source text:\n\n${text}`,
        },
      ],
    });

    const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
    if (!toolUse) {
      return NextResponse.json({ error: 'AI did not return structured content. Please try again.' }, { status: 500 });
    }

    const result = toolUse.input as {
      flashcards: Array<{ front: string; back: string; note?: string }>;
      questions: Array<{
        stem: string;
        explanation: string;
        difficulty: number;
        options: Array<{ label: string; text: string; isCorrect: boolean }>;
      }>;
    };

    return NextResponse.json(result);
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
