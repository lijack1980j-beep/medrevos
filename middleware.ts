import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPrefixes = ['/dashboard', '/study', '/questions', '/flashcards', '/cases', '/admin', '/exam', '/analytics', '/quick', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get('medrev_session')?.value;
  if (!token) {
    const url = new URL('/auth/sign-in', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/study/:path*', '/questions/:path*', '/flashcards/:path*', '/cases/:path*', '/admin/:path*', '/exam/:path*', '/analytics/:path*', '/quick/:path*', '/settings/:path*']
};
