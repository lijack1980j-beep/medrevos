import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

export const SESSION_COOKIE = 'medrev_session';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  examDate: Date | null;
  blockedSections: string[];
};

export async function createSession(userId: string) {
  // Destroy any existing session first (prevents ghost sessions when switching accounts)
  const oldToken = cookies().get(SESSION_COOKIE)?.value;
  if (oldToken) await prisma.session.deleteMany({ where: { token: oldToken } });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { token } });
    cookies().delete(SESSION_COOKIE);
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, examDate: true },
  });
  if (!user) {
    await prisma.session.delete({ where: { token } });
    cookies().delete(SESSION_COOKIE);
    return null;
  }
  return { ...user, blockedSections: [] } satisfies SessionUser;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return user;
}
