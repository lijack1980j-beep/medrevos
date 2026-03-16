import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function SignUpPage() {
  return <div className="center-shell"><AuthForm mode="signup" /><p className="muted center-text">Already registered? <Link href="/auth/sign-in">Sign in</Link></p></div>;
}
