import { prisma } from '@/lib/db';
import { AdminForms } from '@/components/AdminForms';
import { AIGeneratorPanel } from '@/components/AIGeneratorPanel';
import { ContentLibrary } from '@/components/ContentLibrary';
import { requireAdmin } from '@/lib/auth';

export default async function AdminPage() {
  await requireAdmin();

  const [topics, counts] = await Promise.all([
    prisma.topic.findMany({
      select: {
        id: true, title: true, slug: true, system: true,
        summary: true, difficulty: true, estMinutes: true, highYield: true,
        flashcards: { select: { id: true, front: true, back: true, note: true }, orderBy: { createdAt: 'asc' } },
        questions: {
          select: {
            id: true, stem: true, explanation: true, difficulty: true, correctOptionId: true,
            options: { select: { id: true, label: true, text: true, isCorrect: true }, orderBy: { label: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ system: 'asc' }, { title: 'asc' }],
    }),
    Promise.all([
      prisma.user.count(),
      prisma.topic.count(),
      prisma.question.count(),
      prisma.flashcard.count(),
      prisma.lesson.count(),
    ]),
  ]);

  const flatTopics = topics.map(t => ({
    id: t.id, title: t.title, slug: t.slug, system: t.system,
    summary: t.summary, difficulty: t.difficulty, estMinutes: t.estMinutes, highYield: t.highYield,
  }));

  return (
    <div className="admin-page">
      <div>
        <div className="kicker">Content operations</div>
        <h1>Admin panel</h1>
        <p className="muted">Manage content, reseed the demo platform, and grow the study library without editing seed files manually.</p>
      </div>

      <section className="grid cols-4">
        <div className="metric"><div className="kicker">Users</div><h3>{counts[0]}</h3></div>
        <div className="metric"><div className="kicker">Topics</div><h3>{counts[1]}</h3></div>
        <div className="metric"><div className="kicker">Questions</div><h3>{counts[2]}</h3></div>
        <div className="metric"><div className="kicker">Flashcards</div><h3>{counts[3]}</h3></div>
      </section>

      <AIGeneratorPanel topics={flatTopics} />
      <AdminForms topics={flatTopics} />
      <ContentLibrary topics={topics} />
    </div>
  );
}
