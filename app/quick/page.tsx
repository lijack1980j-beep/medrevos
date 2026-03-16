import { requireUser } from '@/lib/auth';
import { QuickFlashcardsClient } from '@/components/QuickFlashcardsClient';

export default async function QuickPage() {
  await requireUser();
  return <QuickFlashcardsClient />;
}
