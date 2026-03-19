import { Suspense } from 'react';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function SignInPage() {
  return <div className="center-shell"><Suspense><AuthForm mode="login" /></Suspense><p className="muted center-text">No account yet? <Link href="/auth/sign-up">Create one</Link></p></div>;
}
