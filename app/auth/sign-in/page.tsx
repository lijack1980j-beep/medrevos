import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function SignInPage() {
  return <div className="center-shell"><AuthForm mode="login" /><p className="muted center-text">No account yet? <Link href="/auth/sign-up">Create one</Link></p></div>;
}
