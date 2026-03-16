import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { StatCard } from '@/components/StatCard';
import { ExamCountdown } from '@/components/ExamCountdown';
import { DailyGoalWidget } from '@/components/DailyGoalWidget';
import { MasteryBar } from '@/components/MasteryBar';
import { SpBar } from '@/components/SpBar';
import { calculateStreak, percent, readinessScore } from '@/lib/analytics';

export default async function DashboardPage() {
  const user = await requireUser();

  const [topics, questionCount, attempts, reviews, progress, caseCount, totalCards, dueStateCount] = await Promise.all([
    prisma.topic.count(),
    prisma.question.count(),
    prisma.questionAttempt.findMany({ where: { userId: user.id }, include: { question: { include: { topic: true } } } }),
    prisma.flashcardReview.findMany({ where: { userId: user.id }, orderBy: { reviewedAt: 'desc' } }),
    prisma.userTopicProgress.findMany({ where: { userId: user.id }, include: { topic: true }, orderBy: { masteryPercent: 'asc' } }),
    prisma.caseStudy.count(),
    prisma.flashcard.count(),
    prisma.userFlashcardState.count({ where: { userId: user.id, dueDate: { lte: new Date() } } }),
  ]);

  const reviewedCardCount = await prisma.userFlashcardState.count({ where: { userId: user.id } });
  const dueCards = dueStateCount + Math.max(0, totalCards - reviewedCardCount);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttempts = attempts.filter(a => a.createdAt.toISOString().slice(0, 10) === todayStr).length;

  const correct = attempts.filter(a => a.isCorrect).length;
  const accuracy = percent(correct, attempts.length);
  const uniqueStudyDays = reviews.map(r => r.reviewedAt.toISOString().slice(0, 10));
  const streak = calculateStreak(uniqueStudyDays);
  const readiness = readinessScore(accuracy, dueCards, streak);
  const weakTopics = progress.slice(0, 4);
  const weakestTopic = weakTopics[0];

  const actions = [
    {
      label: dueCards > 0 ? `Clear ${dueCards} due flashcard${dueCards !== 1 ? 's' : ''}` : 'Flashcards up to date',
      desc: 'Spaced repetition keeps your recall sharp',
      icon: '⚡',
      href: '/flashcards',
    },
    {
      label: weakestTopic ? `Study ${weakestTopic.topic.title}` : 'Browse study topics',
      desc: weakestTopic
        ? `${weakestTopic.masteryPercent}% mastery — your weakest area`
        : 'Open a topic and read its high-yield lesson',
      icon: '🎯',
      href: weakestTopic ? `/study?topic=${weakestTopic.topic.slug}` : '/study',
    },
    {
      label: 'Drill the question bank',
      desc: `${questionCount} USMLE-style MCQs across ${topics} topics`,
      icon: '📝',
      href: '/questions',
    },
    {
      label: 'Review clinical cases',
      desc: 'Build pattern recognition and diagnostic reasoning',
      icon: '📋',
      href: '/cases',
    },
  ];

  // ── Study planner ─────────────────────────────────────────────────────────
  const examDate    = user.examDate ?? null;
  const daysToExam  = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - new Date().setHours(0,0,0,0)) / 86_400_000))
    : null;

  // Urgency-weighted targets: more Qs/cards as exam approaches
  const urgency = daysToExam == null ? 'normal' : daysToExam <= 30 ? 'high' : daysToExam <= 90 ? 'medium' : 'normal';
  const qTarget    = urgency === 'high' ? 30 : urgency === 'medium' ? 20 : 10;
  const cardTarget = urgency === 'high' ? 50 : urgency === 'medium' ? 30 : 20;
  const todayCards = reviews.filter(r => r.reviewedAt.toISOString().slice(0, 10) === todayStr).length;
  const qDone      = todayAttempts;
  const cardsDone  = todayCards;

  const planItems: { label: string; done: number; target: number; href: string; icon: string }[] = [
    { label: 'Flashcards', done: cardsDone, target: Math.max(cardTarget, Math.min(dueCards, cardTarget * 2)), href: '/flashcards', icon: '⚡' },
    { label: 'MCQ questions', done: qDone, target: qTarget, href: '/questions', icon: '📝' },
    ...(weakestTopic
      ? [{ label: `Study: ${weakestTopic.topic.title}`, done: weakestTopic.masteryPercent >= 70 ? 1 : 0, target: 1, href: `/study?topic=${weakestTopic.topic.slug}`, icon: '🎯' }]
      : []),
  ];

  return (
    <div className="dash-page">

      <div className="dash-header">
        <div>
          <div className="kicker">Performance Centre</div>
          <h1 className="dash-title">{user.name}&rsquo;s Dashboard</h1>
          <p className="muted">Track readiness, target weak topics, clear due cards, and build daily momentum.</p>
        </div>
        <div className="dash-header-right">
          <div className="dash-meta">
            <span>{questionCount} questions</span>
            <span className="dash-meta-dot">·</span>
            <span>{caseCount} cases</span>
            <span className="dash-meta-dot">·</span>
            <span>{topics} topics</span>
          </div>
          <ExamCountdown examDate={user.examDate ? user.examDate.toISOString() : null} />
        </div>
      </div>

      <section className="grid cols-4">
        <StatCard title="Readiness"    value={`${readiness}%`}  helper="Blends accuracy, streak, and due load"    trend={readiness >= 70 ? 'up' : readiness >= 40 ? 'neutral' : 'down'} gradient="blue" />
        <StatCard title="Accuracy"     value={`${accuracy}%`}   helper={`${correct} correct of ${attempts.length}`} trend={accuracy >= 70 ? 'up' : accuracy >= 40 ? 'neutral' : 'down'} gradient="purple" />
        <StatCard title="Study Streak" value={`${streak}d`}     helper="Consecutive active days"                  trend={streak > 0 ? 'up' : 'neutral'} gradient="green" />
        <StatCard title="Due Cards"    value={dueCards}          helper="In your personal queue"                   trend={dueCards < 10 ? 'up' : dueCards < 30 ? 'neutral' : 'down'} gradient="orange" />
      </section>

      <DailyGoalWidget todayAttempts={todayAttempts} />

      {/* ── Study planner ── */}
      <div className="panel sp-panel">
        <div className="sp-header">
          <div>
            <div className="kicker">Today&rsquo;s plan</div>
            <h3 className="sp-title">Study planner</h3>
          </div>
          {daysToExam != null && (
            <div className={`sp-exam-badge sp-exam-badge--${urgency}`}>
              <span className="sp-exam-days">{daysToExam}</span>
              <span className="sp-exam-label">days to exam</span>
            </div>
          )}
        </div>
        <div className="sp-items">
          {planItems.map(item => {
            const pct    = Math.min(100, item.target > 0 ? Math.round((item.done / item.target) * 100) : 0);
            const complete = item.done >= item.target;
            return (
              <Link key={item.label} href={item.href as any} className={`sp-item${complete ? ' sp-item--done' : ''}`}>
                <span className="sp-item-icon">{complete ? '✓' : item.icon}</span>
                <div className="sp-item-body">
                  <div className="sp-item-top">
                    <span className="sp-item-label">{item.label}</span>
                    <span className="sp-item-count">{item.done} / {item.target}</span>
                  </div>
                  <div className="sp-bar-track">
                    <SpBar pct={pct} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <section className="grid cols-2">

        <div className="panel">
          <div className="dash-section-head">
            <h3>Weak Topics</h3>
            <span className="dash-section-label">Lowest mastery first</span>
          </div>
          <div className="dash-topic-list">
            {weakTopics.length ? weakTopics.map((entry, i) => (
              <div key={entry.id} className="dash-topic-row">
                <div className={`dash-topic-rank${i < 2 ? ' dash-topic-rank--crit' : ' dash-topic-rank--warn'}`}>
                  {i + 1}
                </div>
                <div className="dash-topic-info">
                  <div className="dash-topic-name-row">
                    <span className="dash-topic-name">{entry.topic.title}</span>
                    <span className="dash-topic-pct">{entry.masteryPercent}%</span>
                  </div>
                  <MasteryBar pct={entry.masteryPercent} />
                </div>
                <div className="dash-topic-actions">
                  <Link href={`/study?topic=${entry.topic.slug}`} className="dash-topic-btn">Study</Link>
                  <Link href={`/questions?topic=${entry.topic.slug}`} className="dash-topic-btn dash-topic-btn--drill">Drill</Link>
                </div>
              </div>
            )) : (
              <p className="muted">No mastery data yet. Solve questions to populate your weak-area map.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="dash-section-head">
            <h3>Next Actions</h3>
            <span className="dash-section-label">Recommended for you</span>
          </div>
          <div className="dash-actions-list">
            {actions.map(action => (
              <Link key={action.href} href={action.href as any} className="dash-action">
                <span className="dash-action-icon">{action.icon}</span>
                <div className="dash-action-body">
                  <span className="dash-action-label">{action.label}</span>
                  <span className="dash-action-desc">{action.desc}</span>
                </div>
                <span className="dash-action-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>

      </section>
    </div>
  );
}
