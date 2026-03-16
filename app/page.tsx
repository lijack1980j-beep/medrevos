import Link from 'next/link';
import { prisma } from '@/lib/db';
import { TopicCard } from '@/components/TopicCard';
import { getCurrentUser } from '@/lib/auth';
import { percent, readinessScore, calculateStreak } from '@/lib/analytics';

export default async function HomePage() {
  const user = await getCurrentUser();

  const [topics, users, attempts, cards] = await Promise.all([
    prisma.topic.findMany({
      select: {
        id: true, slug: true, title: true, system: true,
        summary: true, difficulty: true, estMinutes: true, highYield: true,
        _count: { select: { flashcards: true, questions: true } },
      },
      orderBy: [{ highYield: 'desc' }, { title: 'asc' }],
      take: 6,
    }),
    prisma.user.count(),
    prisma.questionAttempt.count(),
    prisma.flashcard.count(),
  ]);

  // Personalised banner for logged-in users
  let dueCards = 0;
  let readiness = 0;
  if (user) {
    const [totalCards, dueStateCount, userAttempts, userReviews, userFlashcardCount] = await Promise.all([
      cards,
      prisma.userFlashcardState.count({ where: { userId: user.id, dueDate: { lte: new Date() } } }),
      prisma.questionAttempt.findMany({ where: { userId: user.id } }),
      prisma.flashcardReview.findMany({ where: { userId: user.id }, orderBy: { reviewedAt: 'desc' } }),
      prisma.userFlashcardState.count({ where: { userId: user.id } }),
    ]);
    dueCards = dueStateCount + Math.max(0, totalCards - userFlashcardCount);
    const correct = userAttempts.filter(a => a.isCorrect).length;
    const accuracy = percent(correct, userAttempts.length);
    const streak = calculateStreak(userReviews.map(r => r.reviewedAt.toISOString().slice(0, 10)));
    readiness = readinessScore(accuracy, dueCards, streak);
  }

  return (
    <div className="home-page">

      <div className="home-bg-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-bg.jpg" alt="" className="home-bg-img" />

      {user ? (
        /* ── Returning user banner ── */
        <section className="home-welcome">
          <div className="home-welcome-text">
            <div className="kicker">Welcome back</div>
            <h1 className="home-welcome-title">Hey, {user.name.split(' ')[0]}.</h1>
            <p className="muted">
              {dueCards > 0
                ? `You have ${dueCards} card${dueCards !== 1 ? 's' : ''} due for review.`
                : 'All flashcards up to date — great work.'}
            </p>
            <div className="hero-actions">
              <Link href="/dashboard" className="btn primary">Open dashboard</Link>
              {dueCards > 0 && <Link href="/flashcards" className="btn secondary">Clear due cards ⚡</Link>}
              {dueCards === 0 && <Link href="/questions" className="btn secondary">Drill questions</Link>}
            </div>
          </div>
          <div className="panel home-welcome-stat">
            <div className="home-stat-row">
              <div className="home-stat">
                <div className="home-stat-value">{readiness}%</div>
                <div className="home-stat-label">Readiness</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-value">{dueCards}</div>
                <div className="home-stat-label">Due cards</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-value">{topics.length}</div>
                <div className="home-stat-label">Topics</div>
              </div>
            </div>
            <div className="home-quick-links">
              <Link href="/study"      className="home-quick-link">Study →</Link>
              <Link href="/questions"  className="home-quick-link">Qbank →</Link>
              <Link href="/cases"      className="home-quick-link">Cases →</Link>
            </div>
          </div>
        </section>
      ) : (
        /* ── Marketing hero ── */
        <section className="hero">
          <div>
            <div className="kicker">Medical revision platform</div>
            <h1>Accounts, analytics, Qbank, flashcards, and admin — all in one.</h1>
            <p>
              Personal spaced repetition, readiness scoring, mastery tracking, and admin content management
              so the platform behaves like a real product.
            </p>
            <div className="hero-actions">
              <Link href="/auth/sign-up" className="btn primary">Create free account</Link>
              <Link href="/questions"    className="btn secondary">Explore Qbank</Link>
            </div>
          </div>
          <div className="panel">
            <h3>What&rsquo;s included</h3>
            <div className="list muted">
              <span>• Protected accounts with session-based auth</span>
              <span>• Per-user spaced repetition and readiness score</span>
              <span>• Admin CRUD for topics, lessons, flashcards, and questions</span>
              <span>• AI content generator — paste notes, get flashcards + MCQs</span>
              <span>• Topic mastery tracking and weak-area guidance</span>
            </div>
            <div className="grid cols-3 home-hero-metrics">
              <div className="metric compact"><div className="kicker">Users</div><strong>{users}</strong></div>
              <div className="metric compact"><div className="kicker">Attempts</div><strong>{attempts}</strong></div>
              <div className="metric compact"><div className="kicker">Cards</div><strong>{cards}</strong></div>
            </div>
          </div>
        </section>
      )}

      <section className="grid cols-3">
        {topics.map(topic => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </section>

      </div>{/* end home-bg-wrap */}

    </div>
  );
}
