export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { checkAccess } from '@/lib/access';
import { ExamConfig } from '@/components/ExamConfig';

export default async function ExamPage() {
  const user = await requireUser();
  checkAccess(user, 'exam');
  const topics = await prisma.topic.findMany({
    select: { id: true, title: true, system: true, _count: { select: { questions: true } } },
    orderBy: [{ system: 'asc' }, { title: 'asc' }],
  });
  return (
    <div className="exam-config-page">
      <div>
        <div className="kicker">Mock assessment</div>
        <h1>Timed exam</h1>
        <p className="muted">Choose topics, question count, and a time limit. Answers are locked in — no peeking during the exam.</p>
      </div>
      <ExamConfig topics={topics} />
    </div>
  );
}