import { requireUser } from '@/lib/auth';
import { checkAccess } from '@/lib/access';
import { QuickFlashcardsClient } from '@/components/QuickFlashcardsClient';

export default async function QuickPage() {
  const user = await requireUser();
  checkAccess(user, 'quick');
  return <QuickFlashcardsClient />;
}
