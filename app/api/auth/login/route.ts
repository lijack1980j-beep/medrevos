export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(request: Request) {
  try {
    const { email, password } = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }
    // Clean up any expired sessions for this user to prevent ghost session buildup
    await prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: 'Could not sign in.', error: String(error) }, { status: 400 });
  }
}