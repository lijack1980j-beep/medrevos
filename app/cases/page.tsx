export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { CasesClient } from '@/components/CasesClient';
import { requireUser } from '@/lib/auth';
import { checkAccess } from '@/lib/access';
import { getTopicVisibilityWhere } from '@/lib/dbCompat';

export default async function CasesPage() {
  const user = await requireUser();
  checkAccess(user, 'cases');
  const topicVisibilityWhere = await getTopicVisibilityWhere(user.id);
  const cases = await prisma.caseStudy.findMany({
    where: { topic: topicVisibilityWhere },
    include: { topic: true },
    orderBy: [{ topic: { system: 'asc' } }, { title: 'asc' }],
  });

  const grouped = cases.reduce<Record<string, typeof cases>>((acc, c) => {
    const sys = c.topic.system;
    if (!acc[sys]) acc[sys] = [];
    acc[sys].push(c);
    return acc;
  }, {});

  return (
    <div className="cases-page">
      <div>
        <div className="kicker">Clinical reasoning</div>
        <h1>Case mode</h1>
        <p className="muted">
          Work through each case: read the presentation, form a differential, then reveal the diagnosis and management.
          Timer starts when you open the first section. Rate difficulty when done.
        </p>
      </div>

      <CasesClient grouped={grouped} />

      {cases.length === 0 && (
        <div className="panel">
          <p className="muted">No cases yet. Reseed the platform from the admin panel to add demo cases.</p>
        </div>
      )}
    </div>
  );
}
