export const dynamic = 'force-dynamic';

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
import { HourBar } from '@/components/HourBar';
import { RadarChart } from '@/components/RadarChart';
import { PrintButton } from '@/components/PrintButton';

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
    .filter(p => p.lastStudiedAt != null && p.lastStudiedAt < sevenDaysAgo && p.masteryPercent < 80)
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

  // ── Weekly report (this week vs last week) ─────────────────────────────────
  const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - 6);
  const lastWeekStart = new Date(today); lastWeekStart.setDate(today.getDate() - 13);
  const lastWeekEnd   = new Date(today); lastWeekEnd.setDate(today.getDate() - 7);

  const thisWeekAttempts = attempts.filter(a => a.createdAt >= thisWeekStart);
  const lastWeekAttempts = attempts.filter(a => a.createdAt >= lastWeekStart && a.createdAt <= lastWeekEnd);
  const thisWeekCards    = reviews.filter(r => r.reviewedAt >= thisWeekStart);
  const lastWeekCards    = reviews.filter(r => r.reviewedAt >= lastWeekStart && r.reviewedAt <= lastWeekEnd);

  const weekReport = {
    questions:  { now: thisWeekAttempts.length,  prev: lastWeekAttempts.length },
    accuracy:   { now: percent(thisWeekAttempts.filter(a => a.isCorrect).length, thisWeekAttempts.length), prev: percent(lastWeekAttempts.filter(a => a.isCorrect).length, lastWeekAttempts.length) },
    cards:      { now: thisWeekCards.length,      prev: lastWeekCards.length },
    studyDays:  { now: new Set(thisWeekAttempts.map(a => a.createdAt.toISOString().slice(0,10))).size, prev: new Set(lastWeekAttempts.map(a => a.createdAt.toISOString().slice(0,10))).size },
  };

  // ── Best study time (questions by hour of day) ─────────────────────────────
  const hourBuckets: number[] = Array(24).fill(0);
  const hourCorrect: number[] = Array(24).fill(0);
  for (const a of attempts) {
    const h = a.createdAt.getHours();
    hourBuckets[h]++;
    if (a.isCorrect) hourCorrect[h]++;
  }
  const maxHourCount = Math.max(...hourBuckets, 1);
  const hourStats = hourBuckets.map((count, h) => ({
    h, count,
    accuracy: count > 0 ? percent(hourCorrect[h], count) : 0,
    label: `${h.toString().padStart(2,'0')}:00`,
    period: h < 12 ? 'AM' : 'PM',
  }));

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

  // ── Psychology: per-day session maps ───────────────────────────────────────
  const dayQMap: Record<string, number>       = {};
  const dayTopicMap: Record<string, Set<string>> = {};
  for (const a of attempts) {
    const day = a.createdAt.toISOString().slice(0, 10);
    dayQMap[day] = (dayQMap[day] ?? 0) + 1;
    (dayTopicMap[day] ??= new Set()).add(a.question.topicId);
  }
  const sessionCounts  = Object.values(dayQMap);
  const avgQPerSession = sessionCounts.length > 0
    ? sessionCounts.reduce((s, c) => s + c, 0) / sessionCounts.length : 0;
  const maxQPerSession = sessionCounts.length > 0 ? Math.max(...sessionCounts) : 0;

  // Time-of-day distribution
  const nightQs   = attempts.filter(a => a.createdAt.getHours() >= 21).length;
  const earlyQs   = attempts.filter(a => a.createdAt.getHours() < 8).length;

  // Study personality
  let studyPersonality: string, personalityIcon: string, personalityDesc: string;
  if (consistencyScore >= 70 && totalAttempts >= 20) {
    studyPersonality = 'Marathon Runner';  personalityIcon = '🏃';
    personalityDesc = 'You study consistently every day — the single most effective long-term habit for medical exams.';
  } else if (maxQPerSession > avgQPerSession * 3.5 && sessionCounts.length >= 3) {
    studyPersonality = 'Sprinter';         personalityIcon = '⚡';
    personalityDesc = 'You prefer intense study bursts. Spreading sessions across more days gives better spaced-repetition benefits.';
  } else if (nightQs > totalAttempts * 0.45) {
    studyPersonality = 'Night Owl';        personalityIcon = '🦉';
    personalityDesc = 'Most studying happens after 9 PM. Fatigue impairs memory consolidation — shift some sessions to morning.';
  } else if (earlyQs > totalAttempts * 0.4) {
    studyPersonality = 'Early Bird';       personalityIcon = '🌅';
    personalityDesc = 'Morning studying leverages peak working memory — an excellent habit.';
  } else {
    studyPersonality = 'Balanced Learner'; personalityIcon = '⚖️';
    personalityDesc = 'Your study pattern is spread evenly through the day. Keep building consistency.';
  }

  // Burnout risk
  const qDropped     = weekReport.questions.prev > 5 && weekReport.questions.now < weekReport.questions.prev * 0.6;
  const accDrop      = totalAttempts > 15 && recentAccuracy < overallAccuracy - 12;
  const highAgain    = totalReviews > 10 && ratingCounts.AGAIN > totalReviews * 0.45;
  const lowConsist   = consistencyScore < 25 && studyDays.length > 5;
  let burnoutScore   = 0;
  if (qDropped)   burnoutScore += 30;
  if (accDrop)    burnoutScore += 25;
  if (highAgain)  burnoutScore += 20;
  if (lowConsist) burnoutScore += 15;
  if (streak === 0 && studyDays.length > 5) burnoutScore += 10;
  burnoutScore = Math.min(burnoutScore, 100);
  const burnoutLevel = burnoutScore < 30 ? 'Low' : burnoutScore < 60 ? 'Moderate' : 'High';
  const burnoutClass = burnoutScore < 30 ? 'good' : burnoutScore < 60 ? 'warn' : 'danger';
  const burnoutMsg   =
    burnoutLevel === 'High'     ? 'Clear burnout signals — volume and accuracy have both dropped. A structured lighter schedule will outperform pushing through.' :
    burnoutLevel === 'Moderate' ? 'Early fatigue signals visible. One deliberate recovery day per week doubles long-term consolidation.' :
    'No burnout indicators — engagement and energy levels look healthy.';

  // Confidence calibration (easy vs hard questions)
  const easyAttempts = attempts.filter(a => a.question.difficulty <= 2);
  const hardAttempts = attempts.filter(a => a.question.difficulty >= 4);
  const easyAcc = percent(easyAttempts.filter(a => a.isCorrect).length, easyAttempts.length);
  const hardAcc = percent(hardAttempts.filter(a => a.isCorrect).length, hardAttempts.length);
  const hasDiffData  = easyAttempts.length >= 5 && hardAttempts.length >= 5;
  const diffGap      = hasDiffData ? easyAcc - hardAcc : 0;
  let confidenceProfile: string, confidenceIcon: string, confidenceDesc: string;
  if (!hasDiffData) {
    confidenceProfile = 'Not enough data'; confidenceIcon = '📊';
    confidenceDesc = 'Answer more questions across difficulty levels to see your calibration profile.';
  } else if (diffGap > 35 && hardAcc < 45) {
    confidenceProfile = 'Overreaching';      confidenceIcon = '🎲';
    confidenceDesc = `Easy ${easyAcc}% · Hard ${hardAcc}% — large gap. Consolidate fundamentals before advancing to harder material.`;
  } else if (diffGap < 8 && hardAcc >= 60) {
    confidenceProfile = 'Consistently Excellent'; confidenceIcon = '🌟';
    confidenceDesc = `Performing well across all difficulties — ${easyAcc}% easy, ${hardAcc}% hard. Outstanding range.`;
  } else if (diffGap < 18) {
    confidenceProfile = 'Well-calibrated';   confidenceIcon = '🎯';
    confidenceDesc = `${easyAcc}% on easy, ${hardAcc}% on hard — you're meeting expected difficulty gradients.`;
  } else {
    confidenceProfile = 'Foundation Building'; confidenceIcon = '🏗️';
    confidenceDesc = `${easyAcc}% easy, ${hardAcc}% hard — normal stage. Hard topics will improve as foundations solidify.`;
  }

  // Cognitive resilience (accuracy immediately after a wrong answer)
  let postWrongTotal = 0, postWrongCorrect = 0;
  for (let i = 0; i < attempts.length - 1; i++) {
    if (!attempts[i].isCorrect) {
      postWrongTotal++;
      if (attempts[i + 1].isCorrect) postWrongCorrect++;
    }
  }
  const resilienceRate  = postWrongTotal >= 5 ? percent(postWrongCorrect, postWrongTotal) : null;
  const resilienceIcon  = resilienceRate === null ? '🔬' : resilienceRate >= 65 ? '💪' : resilienceRate >= 45 ? '🔄' : '🧘';
  const resilienceLevel = resilienceRate === null ? 'Unknown' : resilienceRate >= 65 ? 'High' : resilienceRate >= 45 ? 'Moderate' : 'Low';
  const resilienceDesc  =
    resilienceRate === null ? 'Answer more questions to measure your bounce-back rate after wrong answers.' :
    resilienceRate >= 65    ? `You bounce back fast — ${resilienceRate}% accuracy on the very next question. Strong exam-day mental resilience.` :
    resilienceRate >= 45    ? `After a wrong answer your accuracy drops slightly (${resilienceRate}% next Q). A 3-second pause and breath before moving on helps.` :
    `Wrong answers shake your confidence — only ${resilienceRate}% accuracy immediately after. Read each explanation fully; understanding beats speed.`;

  // Focus style
  const topicsPerDayArr = Object.values(dayTopicMap).map(s => s.size);
  const avgTopicsPerDay = topicsPerDayArr.length > 0
    ? topicsPerDayArr.reduce((s, c) => s + c, 0) / topicsPerDayArr.length : 0;
  let focusStyle: string, focusIcon: string, focusDesc: string;
  if (avgTopicsPerDay === 0) {
    focusStyle = 'Unknown'; focusIcon = '🔬'; focusDesc = 'No session data yet.';
  } else if (avgTopicsPerDay <= 1.8) {
    focusStyle = 'Deep Diver';        focusIcon = '🎯';
    focusDesc  = `Avg ${avgTopicsPerDay.toFixed(1)} topics/session — you go deep on one topic at a time. Excellent for mastery.`;
  } else if (avgTopicsPerDay <= 4) {
    focusStyle = 'Balanced Explorer'; focusIcon = '🗺️';
    focusDesc  = `Avg ${avgTopicsPerDay.toFixed(1)} topics/session — balancing breadth and depth well.`;
  } else {
    focusStyle = 'Broad Scatterer';   focusIcon = '🌐';
    focusDesc  = `Avg ${avgTopicsPerDay.toFixed(1)} topics/session — many topics per session reduce depth. Focus on 2–3 per session.`;
  }

  // Best weekday & peak accuracy 3-hour block
  const weekdayCounts: Record<number, number> = {};
  for (const a of attempts) weekdayCounts[a.createdAt.getDay()] = (weekdayCounts[a.createdAt.getDay()] ?? 0) + 1;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const bestWeekday = Object.entries(weekdayCounts).sort(([,a],[,b]) => b - a)[0];
  const bestDayName = bestWeekday ? dayNames[parseInt(bestWeekday[0])] : null;

  // Momentum trend: last 7 days accuracy vs previous 7
  const momentumDelta = weekReport.accuracy.now - weekReport.accuracy.prev;
  const momentumLabel =
    momentumDelta >= 5  ? 'Accelerating 🚀' :
    momentumDelta >= 1  ? 'Rising ↗' :
    momentumDelta >= -4 ? 'Holding steady →' :
    momentumDelta >= -10 ? 'Slipping ↘' : 'Declining ↓';
  const momentumClass =
    momentumDelta >= 3  ? 'good' :
    momentumDelta >= -4 ? 'neutral' : 'warn';

  // Avoidance: topics never attempted despite being suggested (not started)
  const avoidedTopics = allTopics
    .filter(t => !(t.id in progressById))
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 3);

  // Narrative paragraph (server-side, template-based)
  const narrativeParts: string[] = [];
  if (totalAttempts > 0) {
    narrativeParts.push(
      `As a ${studyPersonality}, you ${
        studyPersonality === 'Marathon Runner' ? 'show up every day — the single strongest predictor of exam success' :
        studyPersonality === 'Sprinter'        ? 'study in intense bursts, missing the retention gains from daily spaced practice' :
        studyPersonality === 'Night Owl'       ? 'burn the midnight oil; late-night studying under fatigue limits memory consolidation' :
        studyPersonality === 'Early Bird'      ? 'leverage peak morning cognition for your hardest material — keep it up' :
        'spread your sessions reasonably across the day'
      }.`
    );
    if (burnoutLevel !== 'Low') {
      narrativeParts.push(
        burnoutLevel === 'High'
          ? 'Your data shows clear burnout signals — both question volume and accuracy are trending down. A 2-day lighter schedule now will save weeks later.'
          : 'Early fatigue signals are appearing. Rest is a study strategy — one structured recovery day per week doubles consolidation speed.'
      );
    }
    if (resilienceRate !== null) {
      narrativeParts.push(
        resilienceRate >= 65
          ? `Psychologically you are resilient — wrong answers do not derail you (${resilienceRate}% bounce-back rate), a strong predictor of performance under exam pressure.`
          : `Your confidence dips after wrong answers (${resilienceRate}% bounce-back). Slow down, read explanations deliberately — understanding over speed.`
      );
    }
    if (hasDiffData) {
      narrativeParts.push(
        hardAcc < 50
          ? `Your confidence calibration shows a gap on harder questions (${hardAcc}%) — prioritise building core knowledge before advancing to clinical reasoning.`
          : `Your difficulty calibration is solid — you perform well across easy and hard questions alike.`
      );
    }
    if (momentumDelta >= 5) narrativeParts.push('Your accuracy momentum is accelerating — whatever you changed recently is working.');
    if (momentumDelta <= -10) narrativeParts.push('Your accuracy has dropped noticeably this week — review your error patterns and slow down on explanations.');
  } else {
    narrativeParts.push('Start answering questions to unlock your personalised psychology profile.');
  }
  const narrative = narrativeParts.join(' ');

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
      <div className="an-page-actions">
        <PrintButton label="Export PDF" className="btn an-print-btn" />
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
                    {s.accuracy >= 80 && <span className="an-cert-badge" title="Mastery achieved">🏆</span>}
                    <span className="analytics-system-count muted">{s.correct}/{s.total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── System radar chart ── */}
        {systemStats.length >= 3 && (
          <div className="panel analytics-panel">
            <h3>System coverage radar</h3>
            <p className="muted analytics-sub">Accuracy per system at a glance</p>
            <div className="an-radar-wrap">
              <RadarChart axes={systemStats.map(s => ({ label: s.sys, value: s.accuracy }))} />
            </div>
          </div>
        )}

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
                const daysSince = Math.floor((today.getTime() - p.lastStudiedAt!.getTime()) / 86_400_000);
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
                  {t.mastery >= 80 && <span className="an-cert-star" title="Mastery achieved">★</span>}
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

        {/* ── Weekly report ── */}
        <div className="panel analytics-panel--wide">
          <div className="analytics-panel-head">
            <div>
              <div className="kicker">Week over week</div>
              <h3>Weekly report</h3>
            </div>
          </div>
          <div className="an-week-grid">
            {([
              { label: 'Questions', now: weekReport.questions.now, prev: weekReport.questions.prev, unit: 'Qs' },
              { label: 'Accuracy',  now: weekReport.accuracy.now,  prev: weekReport.accuracy.prev,  unit: '%'  },
              { label: 'Cards reviewed', now: weekReport.cards.now, prev: weekReport.cards.prev, unit: '' },
              { label: 'Study days', now: weekReport.studyDays.now, prev: weekReport.studyDays.prev, unit: '/7' },
            ] as const).map(stat => {
              const delta = stat.now - stat.prev;
              const up = delta > 0;
              const neutral = delta === 0;
              return (
                <div key={stat.label} className="an-week-stat">
                  <div className="an-week-stat-label">{stat.label}</div>
                  <div className="an-week-stat-now">{stat.now}{stat.unit}</div>
                  <div className={`an-week-delta${up ? ' an-week-delta--up' : neutral ? ' an-week-delta--neutral' : ' an-week-delta--down'}`}>
                    {neutral ? '—' : up ? `+${delta}` : delta} vs last week
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Study time heatmap ── */}
        {totalAttempts > 0 && (
          <div className="panel analytics-panel--wide">
            <div className="analytics-panel-head">
              <div>
                <div className="kicker">When you study best</div>
                <h3>Activity by hour</h3>
              </div>
            </div>
            <div className="an-hour-grid">
              {hourStats.map(h => (
                <div key={h.h} className="an-hour-col" title={`${h.label} — ${h.count} Qs, ${h.accuracy}% accuracy`}>
                  <div className="an-hour-bar-wrap">
                    <HourBar
                      pct={Math.round((h.count / maxHourCount) * 100)}
                      className={`an-hour-bar${h.accuracy >= 75 ? ' an-hour-bar--good' : h.accuracy >= 50 ? ' an-hour-bar--ok' : h.count > 0 ? ' an-hour-bar--low' : ''}`}
                    />
                  </div>
                  {h.h % 6 === 0 && <div className="an-hour-label">{h.h === 0 ? 'midnight' : h.h === 12 ? 'noon' : `${h.h > 12 ? h.h - 12 : h.h}${h.period}`}</div>}
                </div>
              ))}
            </div>
            <div className="an-hour-legend">
              <span className="an-hour-dot an-hour-dot--good" />Good accuracy
              <span className="an-hour-dot an-hour-dot--ok" />Average
              <span className="an-hour-dot an-hour-dot--low" />Below 50%
            </div>
          </div>
        )}

      </div>

      {/* ── Student Psychology section ────────────────────────────── */}
      <section className="an-psy-section">
        <div className="an-psy-header">
          <div className="kicker">Behavioural intelligence</div>
          <h2 className="an-psy-title">Student psychology</h2>
          <p className="muted">How you study — not just what you score. Patterns in your behaviour, resilience, and learning style.</p>
        </div>

        {/* Narrative paragraph */}
        {totalAttempts > 0 && (
          <div className="panel an-psy-narrative">
            <span className="an-psy-narrative-icon">🧠</span>
            <div>
              <p className="an-psy-narrative-text">{narrative}</p>
              <div className="an-psy-narrative-meta">
                {bestDayName && <span>Best day: <strong>{bestDayName}</strong></span>}
                <span>Momentum: <strong className={`an-momentum--${momentumClass}`}>{momentumLabel}</strong></span>
                {resilienceRate !== null && <span>Resilience: <strong>{resilienceRate}% bounce-back</strong></span>}
              </div>
            </div>
          </div>
        )}

        <div className="an-psy-grid">

          {/* Study Personality */}
          <div className="panel an-psy-card">
            <div className="an-psy-card-icon">{personalityIcon}</div>
            <div className="an-psy-card-label">Study personality</div>
            <div className="an-psy-card-value">{studyPersonality}</div>
            <div className="an-psy-card-desc">{personalityDesc}</div>
            <div className="an-psy-card-meta">
              <span>Sessions: <strong>{sessionCounts.length}</strong></span>
              {avgQPerSession > 0 && <span>Avg: <strong>{Math.round(avgQPerSession)} Qs</strong></span>}
            </div>
          </div>

          {/* Burnout Risk */}
          <div className={`panel an-psy-card an-psy-card--${burnoutClass}`}>
            <div className="an-psy-card-icon">
              {burnoutLevel === 'High' ? '🔥' : burnoutLevel === 'Moderate' ? '⚠️' : '✅'}
            </div>
            <div className="an-psy-card-label">Burnout risk</div>
            <div className={`an-psy-card-value an-psy-val--${burnoutClass}`}>{burnoutLevel}</div>
            <progress className={`an-burnout-bar an-burnout-bar--${burnoutClass}`} value={burnoutScore} max={100} />
            <div className="an-psy-card-desc">{burnoutMsg}</div>
            <div className="an-psy-card-meta">
              {qDropped && <span className="an-psy-signal">↓ Volume dropped</span>}
              {accDrop  && <span className="an-psy-signal">↓ Accuracy dropped</span>}
              {highAgain && <span className="an-psy-signal">↑ AGAIN rate high</span>}
            </div>
          </div>

          {/* Confidence Calibration */}
          <div className="panel an-psy-card">
            <div className="an-psy-card-icon">{confidenceIcon}</div>
            <div className="an-psy-card-label">Confidence calibration</div>
            <div className="an-psy-card-value">{confidenceProfile}</div>
            {hasDiffData && (
              <div className="an-psy-diff-row">
                <div className="an-psy-diff-item an-psy-diff-item--easy">
                  <span className="an-psy-diff-label">Easy</span>
                  <span className="an-psy-diff-val">{easyAcc}%</span>
                </div>
                <div className="an-psy-diff-sep">vs</div>
                <div className="an-psy-diff-item an-psy-diff-item--hard">
                  <span className="an-psy-diff-label">Hard</span>
                  <span className="an-psy-diff-val">{hardAcc}%</span>
                </div>
              </div>
            )}
            <div className="an-psy-card-desc">{confidenceDesc}</div>
          </div>

          {/* Cognitive Resilience */}
          <div className="panel an-psy-card">
            <div className="an-psy-card-icon">{resilienceIcon}</div>
            <div className="an-psy-card-label">Cognitive resilience</div>
            <div className="an-psy-card-value">
              {resilienceRate !== null ? `${resilienceRate}%` : resilienceLevel}
            </div>
            {resilienceRate !== null && (
              <progress
                className={`an-resilience-bar an-resilience-bar--${resilienceRate >= 65 ? 'good' : resilienceRate >= 45 ? 'ok' : 'low'}`}
                value={resilienceRate}
                max={100}
              />
            )}
            <div className="an-psy-card-desc">{resilienceDesc}</div>
            {postWrongTotal > 0 && (
              <div className="an-psy-card-meta">
                <span>Sample: <strong>{postWrongTotal}</strong> wrong→next pairs</span>
              </div>
            )}
          </div>

          {/* Focus Style */}
          <div className="panel an-psy-card">
            <div className="an-psy-card-icon">{focusIcon}</div>
            <div className="an-psy-card-label">Focus style</div>
            <div className="an-psy-card-value">{focusStyle}</div>
            <div className="an-psy-card-desc">{focusDesc}</div>
            {avgTopicsPerDay > 0 && (
              <div className="an-psy-focus-bar-wrap">
                <progress className="an-psy-focus-bar" value={Math.round(Math.min(avgTopicsPerDay / 6, 1) * 100)} max={100} />
                <div className="an-psy-focus-labels">
                  <span>Focused</span><span>Scattered</span>
                </div>
              </div>
            )}
          </div>

          {/* Session Pattern */}
          <div className="panel an-psy-card">
            <div className="an-psy-card-icon">📊</div>
            <div className="an-psy-card-label">Session pattern</div>
            <div className="an-psy-card-value">
              {maxQPerSession > 0 ? `${Math.round(avgQPerSession)} avg / day` : '—'}
            </div>
            <div className="an-psy-session-stats">
              {bestDayName && (
                <div className="an-psy-session-row">
                  <span className="an-psy-session-key">Best day</span>
                  <span className="an-psy-session-val">{bestDayName}</span>
                </div>
              )}
              <div className="an-psy-session-row">
                <span className="an-psy-session-key">Peak session</span>
                <span className="an-psy-session-val">{maxQPerSession} Qs</span>
              </div>
              <div className="an-psy-session-row">
                <span className="an-psy-session-key">Study sessions</span>
                <span className="an-psy-session-val">{sessionCounts.length}</span>
              </div>
              <div className="an-psy-session-row">
                <span className="an-psy-session-key">Momentum</span>
                <span className={`an-psy-session-val an-momentum--${momentumClass}`}>{momentumLabel}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Avoidance alert */}
        {avoidedTopics.length > 0 && (
          <div className="an-psy-avoid panel">
            <div className="an-psy-avoid-header">
              <span className="an-psy-avoid-icon">🚧</span>
              <div>
                <div className="an-psy-avoid-title">Avoidance detected</div>
                <div className="an-psy-avoid-sub">High-difficulty topics you have never attempted — often a sign of knowledge avoidance</div>
              </div>
            </div>
            <div className="an-psy-avoid-list">
              {avoidedTopics.map(t => (
                <Link key={t.id} href={`/study?topic=${t.slug}`} className="an-psy-avoid-item">
                  <span>{t.title}</span>
                  <span className="an-psy-avoid-sys muted">{t.system} · Difficulty {t.difficulty}/5</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </section>

    </div>
  );
}