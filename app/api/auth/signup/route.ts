import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';

const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) });

export async function POST(request: Request) {
  try {
    const { name, email, password } = schema.parse(await request.json());
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ message: 'Email already in use.' }, { status: 400 });
    const user = await prisma.user.create({ data: { name, email, passwordHash: hashPassword(password) } });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: 'Could not create account.', error: String(error) }, { status: 400 });
  }
}
