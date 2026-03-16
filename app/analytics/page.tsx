import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  percent,
  calculateStreak,
  computeReadiness,
  projectExamReadiness,
} from '@/lib/analytics';
import { AccuracyChart } from '@/components/AccuracyChart';

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  const [attempts, reviews, topicProgress, allTopics, flashcardStates, totalCards, fullUser] = await Promise.all([
    prisma.questionAttempt.findMany({
      where: { userId: user.id },
      include: { question: { include: { topic: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.flashcardReview.findMany({
      where: { userId: user.id },
      include: { flashcard: { include: { topic: true } } },
      orderBy: { reviewedAt: 'asc' },
    }),
    prisma.userTopicProgress.findMany({
      where: { userId: user.id },
      include: { topic: true },
      orderBy: { masteryPercent: 'asc' },
    }),
    prisma.topic.findMany({ select: { id: true, title: true, system: true, difficulty: true, slug: true } }),
    prisma.userFlashcardState.findMany({ where: { userId: user.id } }),
    prisma.flashcard.count(),
    prisma.user.findUnique({ where: { id: user.id }, select: { examDate: true } }),
  ]);

  const today = new Date();

  // ── Core stats ─────────────────────────────────────────────────────────────
  const totalAttempts  = attempts.length;
  const correctAttempts = attempts.filter(a => a.isCorrect).length;
  const overallAccuracy = percent(correctAttempts, totalAttempts);
  const totalReviews   = reviews.length;
  const studyDays      = [...new Set(reviews.map(r => r.reviewedAt.toISOString().slice(0, 10)))];
  const streak         = calculateStreak(studyDays);
  const dueNow         = flashcardStates.filter(s => s.dueDate <= today).length;

  // ── Last-7-day accuracy ────────────────────────────────────────────────────
  const last7 = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    })
  );
  const recentAttempts  = attempts.filter(a => last7.has(a.createdAt.toISOString().slice(0, 10)));
  const recentAccuracy  = percent(recentAttempts.filter(a => a.isCorrect).length, recentAttempts.length);

  // ── Topic coverage ─────────────────────────────────────────────────────────
  const topicAttemptCounts: Record<string, number> = {};
  for (const a of attempts) {
    topicAttemptCounts[a.question.topicId] = (topicAttemptCounts[a.question.topicId] ?? 0) + 1;
  }
  const coveredTopics   = Object.values(topicAttemptCounts).filter(c => c >= 3).length;
  const topicCoverage   = percent(coveredTopics, allTopics.length);

  // ── Flashcard health ───────────────────────────────────────────────────────
  const ratingCounts = { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 };
  for (const r of reviews) ratingCounts[r.rating as keyof typeof ratingCounts]++;
  const retentionRate = percent(ratingCounts.GOOD + ratingCounts.EASY, totalReviews);
  const avgEase       = flashcardStates.length
    ? Math.round((flashcardStates.reduce((s, f) => s + f.easeFactor, 0) / flashcardStates.length) * 100) / 100
    : 2.5;

  // ── Deck freshness ─────────────────────────────────────────────────────────
  const freshnessScore  = totalCards > 0 ? Math.round((1 - dueNow / totalCards) * 100) : 100;

  // ── Consistency (days studied in last 14) ──────────────────────────────────
  const last14Set = new Set(
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    })
  );
  const studiedDaysLast14  = [...last14Set].filter(d => studyDays.includes(d)).length;
  const consistencyScore   = Math.round((studiedDaysLast14 / 14) * 100);

  // ── Readiness report ───────────────────────────────────────────────────────
  const readiness = computeReadiness({
    overallAccuracy,
    recentAccuracy: totalAttempts === 0 ? 0 : recentAccuracy,
    topicCoverage,
    retentionRate,
    freshnessScore,
    consistencyScore,
  });

  // ── Weekly activity ────────────────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const dayStudied   = new Set(studyDays);
  const weekActivity = weekDays.map(d => ({
    label: new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
    active: dayStudied.has(d),
    questions: attempts.filter(a => a.createdAt.toISOString().slice(0, 10) === d).length,
    cards: reviews.filter(r => r.reviewedAt.toISOString().slice(0, 10) === d).length,
  }));

  // ── 14-day chart ───────────────────────────────────────────────────────────
  const chartDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const chartData = chartDays.map(day => {
    const dayAttempts = attempts.filter(a => a.createdAt.toISOString().slice(0, 10) === day);
    return {
      label: new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
      total: dayAttempts.length,
      correct: dayAttempts.filter(a => a.isCorrect).length,
    };
  });

  // ── System performance ─────────────────────────────────────────────────────
  const systemMap: Record<string, { correct: number; total: number }> = {};
  for (const a of attempts) {
    const sys = a.question.topic.system;
    if (!systemMap[sys]) systemMap[sys] = { correct: 0, total: 0 };
    systemMap[sys].total++;
    if (a.isCorrect) systemMap[sys].correct++;
  }
  const systemStats = Object.entries(systemMap)
    .map(([sys, s]) => ({ sys, accuracy: percent(s.correct, s.total), total: s.total, correct: s.correct }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // ── Knowledge decay: topics not studied in ≥7 days and mastery < 80 ────────
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const decayTopics  = topicProgress
    .filter(p => p.lastStudiedAt < sevenDaysAgo && p.masteryPercent < 80)
    .sort((a, b) => a.masteryPercent - b.masteryPercent)
    .slice(0, 5);

  // ── Error patterns ─────────────────────────────────────────────────────────
  const topicErrors: Record<string, { title: string; wrong: number; total: number }> = {};
  for (const a of attempts) {
    const tid = a.question.topicId;
    if (!topicErrors[tid]) topicErrors[tid] = { title: a.question.topic.title, wrong: 0, total: 0 };
    topicErrors[tid].total++;
    if (!a.isCorrect) topicErrors[tid].wrong++;
  }
  const errorTopics = Object.values(topicErrors)
    .filter(t => t.total >= 3)
    .sort((a, b) => percent(b.wrong, b.total) - percent(a.wrong, a.total))
    .slice(0, 5);

  // ── Mastery map ────────────────────────────────────────────────────────────
  const progressById: Record<string, number> = {};
  for (const p of topicProgress) progressById[p.topicId] = p.masteryPercent;
  const masteryTopics = allTopics.map(t => ({ ...t, mastery: progressById[t.id] ?? 0, started: t.id in progressById }));
  const notStarted    = masteryTopics.filter(t => !t.started).length;

  // ── Exam projection ────────────────────────────────────────────────────────
  const examDate   = fullUser?.examDate ?? null;
  const projection = examDate ? projectExamReadiness(readiness.total, chartData, examDate) : null;

  // ── Insights ───────────────────────────────────────────────────────────────
  const insights: { type: 'positive' | 'warning' | 'neutral'; text: string }[] = [];
  if (totalAttempts === 0) {
    insights.push({ type: 'neutral', text: 'No questions answered yet — head to Qbank to get started.' });
  } else {
    if (overallAccuracy >= 75) insights.push({ type: 'positive', text: `Overall accuracy ${overallAccuracy}% — above the 75% passing threshold.` });
    else if (overallAccuracy >= 55) insights.push({ type: 'neutral', text: `Accuracy ${overallAccuracy}% — in the mid-range. Consistent practice will push this above 75%.` });
    else insights.push({ type: 'warning', text: `Accuracy ${overallAccuracy}% — below threshold. Review explanations carefully rather than drilling more volume.` });

    if (systemStats.length > 0) {
      const weakest  = systemStats[0];
      const strongest = systemStats[systemStats.length - 1];
      if (weakest.accuracy < 60)  insights.push({ type: 'warning',  text: `${weakest.sys} is your weakest system at ${weakest.accuracy}% (${weakest.total} attempts) — prioritise focused review here.` });
      if (strongest.accuracy >= 80 && strongest.sys !== weakest.sys) insights.push({ type: 'positive', text: `${strongest.sys} is your strongest system at ${strongest.accuracy}%.` });
    }
  }
  if (streak >= 7)       insights.push({ type: 'positive', text: `${streak}-day study streak — excellent consistency.` });
  else if (streak >= 3)  insights.push({ type: 'neutral',  text: `${streak}-day streak — good momentum. Aim for 7 consecutive days.` });
  else if (studyDays.length > 0) insights.push({ type: 'warning', text: 'Streak broken — even 10 minutes of card review per day preserves long-term retention.' });

  if (totalReviews > 0) {
    if (retentionRate >= 70) insights.push({ type: 'positive', text: `Flashcard retention ${retentionRate}% GOOD/EASY — memory consolidation is strong.` });
    else if (ratingCounts.AGAIN > totalReviews * 0.4) insights.push({ type: 'warning', text: `${percent(ratingCounts.AGAIN, totalReviews)}% of cards rated AGAIN — study fewer cards more deeply.` });
  }
  if (dueNow > 20) insights.push({ type: 'warning', text: `${dueNow} flashcards overdue — a large backlog degrades retention. Aim to clear it within 3 days.` });
  else if (dueNow === 0 && totalReviews > 0) insights.push({ type: 'positive', text: 'All flashcards up to date — your spaced repetition schedule is perfectly maintained.' });
  if (notStarted > 0) insights.push({ type: 'neutral', text: `${notStarted} topic${notStarted !== 1 ? 's' : ''} not yet studied — explore them in Study mode.` });
  if (avgEase < 2.0 && flashcardStates.length > 5) insights.push({ type: 'warning', text: `Average ease factor ${avgEase} — many cards feel difficult. Review source material before drilling.` });

  // ── Recommendations ────────────────────────────────────────────────────────
  const recommendations = topicProgress
    .filter(p => p.masteryPercent < 70)
    .slice(0, 4)
    .map(p => ({ slug: p.topic.slug, title: p.topic.title, mastery: p.masteryPercent, system: p.topic.system }));

  const velClass =
    readiness.velocity === 'improving' ? 'an-velocity--up' :
    readiness.velocity === 'declining' ? 'an-velocity--down' : 'an-velocity--stable';

  const bandKey = readiness.band.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="analytics-page">

      <div>
        <div className="kicker">Learning intelligence</div>
        <h1>Your analytics</h1>
        <p className="muted">A deep look at your readiness, study patterns, retention health, and where to focus next.</p>
      </div>

      {/* ── Readiness hero ── */}
      <section className="an-readiness-hero panel">
        <div className="an-readiness-left">
          <div className={`an-readiness-score an-band--${bandKey}`}>{readiness.total}</div>
          <div className="an-readiness-label">Readiness score</div>
          <div className={`an-readiness-band an-band--${bandKey}`}>
            {readiness.band}
          </div>
          <div className={`an-velocity ${velClass}`}>{readiness.velocityLabel}</div>
          {projection && (
            <div className={`an-projection-pill${projection.onTrack ? ' an-projection-pill--ok' : ' an-projection-pill--warn'}`}>
              <span className="an-projection-days">{projection.daysToExam}d</span>
              <span>to exam · projected <strong>{projection.projectedScore}%</strong></span>
            </div>
          )}
        </div>

        <div className="an-readiness-right">
          <div className="an-breakdown-title">Score breakdown</div>
          {readiness.components.map(c => (
            <div key={c.key} className="an-breakdown-row">
              <div className="an-breakdown-meta">
                <span className="an-breakdown-label">{c.label}</span>
                <span className={`an-breakdown-score an-breakdown-score--${c.status}`}>{c.score}%</span>
              </div>
              <div className="an-breakdown-track">
                <div
                  className={`an-breakdown-fill an-breakdown-fill--${c.status}`}
                  style={{ '--bw': `${c.score}%` } as React.CSSProperties}
                />
              </div>
              <div className="an-breakdown-hint">{c.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Exam projection detail (if set) ── */}
      {projection && (
        <section className={`panel an-projection-panel${projection.onTrack ? '' : ' an-projection-panel--warn'}`}>
          <div className="an-projection-header">
            <h3>Exam readiness projection</h3>
            <span className={`an-projection-verdict${projection.onTrack ? ' an-projection-verdict--ok' : ' an-projection-verdict--warn'}`}>
              {projection.onTrack ? 'On track' : 'Needs acceleration'}
            </span>
          </div>
          <p className="muted">{projection.message}</p>
          <div className="an-projection-stats">
            <div className="an-projection-stat">
              <div className="an-projection-stat-val">{projection.daysToExam}</div>
              <div className="an-projection-stat-lbl">Days to exam</div>
            </div>
            <div className="an-projection-stat">
              <div className="an-projection-stat-val">{readiness.total}%</div>
              <div className="an-projection-stat-lbl">Today</div>
            </div>
            <div className="an-projection-stat">
              <div className={`an-projection-stat-val${projection.onTrack ? ' an-projection-stat-val--ok' : ' an-projection-stat-val--warn'}`}>
                {projection.projectedScore}%
              </div>
              <div className="an-projection-stat-lbl">Projected</div>
            </div>
            <div className="an-projection-stat">
              <div className="an-projection-stat-val">{projection.dailyDelta > 0 ? '+' : ''}{projection.dailyDelta}</div>
              <div className="an-projection-stat-lbl">Points/day</div>
            </div>
          </div>
          {!projection.onTrack && (
            <p className="muted an-projection-advice">
              To reach 70% by exam day, focus on your weakest system ({systemStats[0]?.sys ?? 'untested topics'}) and clear your flashcard backlog daily.
            </p>
          )}
        </section>
      )}

      <div className="analytics-grid">

        {/* ── 14-day accuracy chart ── */}
        <div className="panel analytics-panel analytics-panel--wide">
          <h3>14-day question accuracy</h3>
          <p className="muted analytics-sub">Bar height = volume · colour = accuracy</p>
          <AccuracyChart data={chartData} />
        </div>

        {/* ── Weekly activity ── */}
        <div className="panel analytics-panel">
          <h3>Weekly activity</h3>
          <div className="analytics-week">
            {weekActivity.map(d => (
              <div key={d.label} className="analytics-day">
                <div className={`analytics-day-bar${d.active ? ' analytics-day-bar--active' : ''}`}>
                  {d.active && <span className="analytics-day-tooltip">{d.questions}q · {d.cards}c</span>}
                </div>
                <span className="analytics-day-label">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="muted analytics-week-sub">{studyDays.length} study days total · {streak}d streak · {studiedDaysLast14}/14 days this fortnight</p>
        </div>

        {/* ── Performance by system ── */}
        <div className="panel analytics-panel analytics-panel--wide">
          <h3>Performance by system</h3>
          {systemStats.length === 0 ? (
            <p className="muted">Answer some questions to see system breakdowns.</p>
          ) : (
            <div className="analytics-systems">
              {systemStats.map(s => {
                const hue = Math.round((s.accuracy / 100) * 120);
                return (
                  <div key={s.sys} className="analytics-system-row">
                    <span className="analytics-system-name">{s.sys}</span>
                    <div className="analytics-system-bar-wrap">
                      <div className="analytics-system-bar" style={{ '--w': `${s.accuracy}%`, '--hue': hue } as React.CSSProperties} />
                    </div>
                    <span className="analytics-system-pct">{s.accuracy}%</span>
                    <span className="analytics-system-count muted">{s.correct}/{s.total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Flashcard health ── */}
        <div className="panel analytics-panel">
          <h3>Flashcard health</h3>
          {totalReviews === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            <>
              <div className="analytics-ratings">
                {(['AGAIN', 'HARD', 'GOOD', 'EASY'] as const).map(r => {
                  const n   = ratingCounts[r];
                  const pct = percent(n, totalReviews);
                  return (
                    <div key={r} className="analytics-rating-row">
                      <span className={`analytics-rating-label analytics-rating-label--${r.toLowerCase()}`}>{r}</span>
                      <div className="analytics-rating-bar-wrap">
                        <div className="analytics-rating-bar" style={{ '--w': `${pct}%` } as React.CSSProperties} />
                      </div>
                      <span className="analytics-rating-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="analytics-health-meta">
                <span>Retention <strong>{retentionRate}%</strong></span>
                <span>Avg ease <strong>{avgEase}</strong></span>
                <span>Due now <strong>{dueNow}</strong></span>
                <span>Total <strong>{totalCards}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* ── Knowledge decay ── */}
        {decayTopics.length > 0 && (
          <div className="panel analytics-panel">
            <h3>Knowledge decay risk</h3>
            <p className="muted analytics-sub">Topics not studied in 7+ days with mastery below 80%</p>
            <div className="an-decay-list">
              {decayTopics.map(p => {
                const daysSince = Math.floor((today.getTime() - p.lastStudiedAt.getTime()) / 86_400_000);
                const urgency   = daysSince >= 14 ? 'an-decay-row--urgent' : daysSince >= 7 ? 'an-decay-row--warn' : '';
                return (
                  <Link key={p.id} href={`/study?topic=${p.topic.slug}`} className={`an-decay-row ${urgency}`}>
                    <div className="an-decay-info">
                      <span className="an-decay-topic">{p.topic.title}</span>
                      <span className="an-decay-sys muted">{p.topic.system}</span>
                    </div>
                    <div className="an-decay-right">
                      <span className="an-decay-days">{daysSince}d ago</span>
                      <span className="an-decay-mastery">{p.masteryPercent}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Insights ── */}
        <div className="panel analytics-panel analytics-panel--wide">
          <h3>Learning insights</h3>
          <div className="analytics-insights">
            {insights.map((ins, i) => (
              <div key={i} className={`analytics-insight analytics-insight--${ins.type}`}>
                <span className="analytics-insight-dot" />
                <p>{ins.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Error patterns ── */}
        {errorTopics.length > 0 && (
          <div className="panel analytics-panel">
            <h3>Error patterns</h3>
            <p className="muted analytics-sub">Topics with most wrong answers (min 3 attempts)</p>
            <div className="analytics-error-list">
              {errorTopics.map(t => (
                <div key={t.title} className="analytics-error-row">
                  <span className="analytics-error-topic">{t.title}</span>
                  <span className="analytics-error-pct analytics-insight--warning-text">
                    {percent(t.wrong, t.total)}% wrong ({t.wrong}/{t.total})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Topic mastery map ── */}
        <div className="panel analytics-panel">
          <h3>Topic mastery map</h3>
          <p className="muted analytics-sub">{notStarted} topics not yet started · {coveredTopics}/{allTopics.length} with ≥3 attempts</p>
          <div className="analytics-mastery-grid">
            {masteryTopics.map(t => {
              const hue = Math.round((t.mastery / 100) * 120);
              return (
                <Link
                  key={t.id}
                  href={`/study?topic=${t.slug}`}
                  className={`analytics-mastery-cell${t.started ? ' analytics-mastery-cell--started' : ''}`}
                  title={`${t.title} — ${t.mastery}% mastery`}
                  style={t.started ? { '--hue': hue } as React.CSSProperties : undefined}
                >
                  <span className="analytics-mastery-pct">{t.mastery}%</span>
                  <span className="analytics-mastery-name">{t.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Study recommendations ── */}
        {recommendations.length > 0 && (
          <div className="panel analytics-panel">
            <h3>Focus recommendations</h3>
            <p className="muted analytics-sub">Lowest mastery — tackle these next</p>
            <div className="analytics-recs">
              {recommendations.map((r, i) => (
                <Link key={r.slug} href={`/study?topic=${r.slug}`} className="analytics-rec-row">
                  <span className="analytics-rec-rank">#{i + 1}</span>
                  <div className="analytics-rec-info">
                    <span className="analytics-rec-title">{r.title}</span>
                    <span className="analytics-rec-sys muted">{r.system}</span>
                  </div>
                  <div className="analytics-rec-bar-wrap">
                    <div className="analytics-rec-bar" style={{ '--w': `${r.mastery}%` } as React.CSSProperties} />
                  </div>
                  <span className="analytics-rec-pct">{r.mastery}%</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
