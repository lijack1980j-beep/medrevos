export function percent(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export function calculateStreak(days: string[]) {
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Readiness engine ──────────────────────────────────────────────────────────

export type ReadinessStatus = 'good' | 'ok' | 'weak';
export type Velocity = 'improving' | 'stable' | 'declining' | 'new';

export interface ReadinessComponent {
  key: string;
  label: string;
  score: number;       // 0–100
  weight: number;      // fraction, sums to 1
  contribution: number;
  hint: string;
  status: ReadinessStatus;
}

export interface ReadinessReport {
  total: number;
  band: string;
  bandColor: string;
  velocity: Velocity;
  velocityLabel: string;
  components: ReadinessComponent[];
}

export interface ReadinessInput {
  overallAccuracy: number;      // % correct across all attempts
  recentAccuracy: number;       // % correct in last 7 days
  topicCoverage: number;        // % topics with ≥3 attempts
  retentionRate: number;        // % flashcard reviews rated GOOD or EASY
  freshnessScore: number;       // 100 × (1 − dueCards/totalCards)
  consistencyScore: number;     // 100 × studiedDaysLast14/14
}

function componentStatus(score: number): ReadinessStatus {
  return score >= 70 ? 'good' : score >= 45 ? 'ok' : 'weak';
}

export function computeReadiness(input: ReadinessInput): ReadinessReport {
  const { overallAccuracy, recentAccuracy, topicCoverage, retentionRate, freshnessScore, consistencyScore } = input;

  const raw: Omit<ReadinessComponent, 'contribution' | 'status'>[] = [
    {
      key: 'accuracy',
      label: 'Question accuracy',
      score: overallAccuracy,
      weight: 0.28,
      hint:
        overallAccuracy >= 75 ? 'Above the 75% passing threshold — solid foundation.'
        : overallAccuracy >= 55 ? 'Approaching passing — aim for 75%+.'
        : 'Below threshold — focus on understanding explanations, not just volume.',
    },
    {
      key: 'momentum',
      label: 'Recent momentum',
      score: recentAccuracy,
      weight: 0.22,
      hint:
        recentAccuracy > overallAccuracy + 5 ? 'Trending up — your recent sessions are outperforming your baseline.'
        : recentAccuracy < overallAccuracy - 10 ? 'Recent performance dipping — consider a rest day or topic switch.'
        : 'Consistent with your overall baseline.',
    },
    {
      key: 'coverage',
      label: 'Topic coverage',
      score: topicCoverage,
      weight: 0.20,
      hint:
        topicCoverage >= 80 ? 'Broad coverage across the curriculum.'
        : topicCoverage >= 50 ? 'Good breadth — push into untouched topics.'
        : 'Large gaps — many topics have fewer than 3 attempts.',
    },
    {
      key: 'retention',
      label: 'Flashcard retention',
      score: retentionRate,
      weight: 0.15,
      hint:
        retentionRate >= 70 ? 'Strong memory consolidation.'
        : retentionRate >= 50 ? 'Moderate — fewer new cards, more repetitions.'
        : 'High forget rate — slow down and study source material before drilling.',
    },
    {
      key: 'freshness',
      label: 'Deck freshness',
      score: freshnessScore,
      weight: 0.08,
      hint:
        freshnessScore >= 80 ? 'Deck up to date — no backlog.'
        : freshnessScore >= 50 ? 'Some cards overdue — clear the backlog.'
        : 'Large backlog — retention degrades quickly. Clear it before adding new cards.',
    },
    {
      key: 'consistency',
      label: 'Study consistency',
      score: consistencyScore,
      weight: 0.07,
      hint:
        consistencyScore >= 80 ? 'Excellent daily habit — spaced repetition is working.'
        : consistencyScore >= 50 ? 'Good consistency — push toward daily sessions.'
        : 'Irregular sessions — long gaps destroy retention gains.',
    },
  ];

  const components: ReadinessComponent[] = raw.map(c => ({
    ...c,
    contribution: Math.round(c.score * c.weight),
    status: componentStatus(c.score),
  }));

  const total = Math.max(0, Math.min(100, Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0)
  )));

  const band =
    total >= 85 ? 'Exam ready' :
    total >= 70 ? 'Near exam-ready' :
    total >= 55 ? 'On track' :
    total >= 40 ? 'Building confidence' :
    total >= 20 ? 'Learning phase' :
    'Foundation building';

  const bandColor =
    total >= 85 ? '#34d399' :
    total >= 70 ? '#22d3ee' :
    total >= 55 ? '#818cf8' :
    total >= 40 ? '#fb923c' :
    total >= 20 ? '#f97316' : '#f87171';

  const hasData = overallAccuracy > 0 || retentionRate > 0;
  const velocity: Velocity =
    !hasData ? 'new' :
    recentAccuracy > overallAccuracy + 5 ? 'improving' :
    recentAccuracy < overallAccuracy - 10 ? 'declining' :
    'stable';

  const velocityLabel =
    velocity === 'improving' ? '↑ Improving' :
    velocity === 'declining' ? '↓ Declining — adjust strategy' :
    velocity === 'new'       ? 'Not enough data yet' :
    '→ Stable';

  return { total, band, bandColor, velocity, velocityLabel, components };
}

// ── Exam projection ───────────────────────────────────────────────────────────

export interface ExamProjection {
  daysToExam: number;
  projectedScore: number;
  dailyDelta: number;          // average score change per day (from 14-day trend)
  onTrack: boolean;
  message: string;
}

export function projectExamReadiness(
  currentScore: number,
  chartData: { total: number; correct: number }[],
  examDate: Date,
): ExamProjection {
  const now = new Date();
  const daysToExam = Math.ceil((examDate.getTime() - now.getTime()) / 86_400_000);

  // Compute daily accuracy values from chart (only days with ≥2 attempts)
  const dailyScores = chartData
    .filter(d => d.total >= 2)
    .map(d => percent(d.correct, d.total));

  let dailyDelta = 0;
  if (dailyScores.length >= 4) {
    // Simple linear regression slope over valid days
    const n = dailyScores.length;
    const xMean = (n - 1) / 2;
    const yMean = dailyScores.reduce((a, b) => a + b, 0) / n;
    const num = dailyScores.reduce((s, y, i) => s + (i - xMean) * (y - yMean), 0);
    const den = dailyScores.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
    const slope = den > 0 ? num / den : 0;
    // slope is accuracy change per day; translate to readiness delta (accuracy weight = 0.28 + 0.22 = 0.5 combined)
    dailyDelta = Math.round(slope * 0.5 * 10) / 10;
  }

  const rawProjected = currentScore + dailyDelta * Math.min(daysToExam, 60);
  const projectedScore = Math.max(0, Math.min(100, Math.round(rawProjected)));
  const onTrack = projectedScore >= 70;

  const message =
    daysToExam <= 0 ? 'Your exam date has passed.' :
    daysToExam <= 3 ? `${daysToExam} day${daysToExam !== 1 ? 's' : ''} to exam — final review mode.` :
    onTrack ? `At this pace you'll reach ${projectedScore}% by exam day — you're on track.` :
    `At this pace you'll reach ${projectedScore}% — accelerate to hit 70%+ before exam day.`;

  return { daysToExam, projectedScore, dailyDelta, onTrack, message };
}

// ── Legacy helper (used by dashboard) ────────────────────────────────────────

export function readinessScore(accuracy: number, dueCards: number, streakDays: number) {
  const score = accuracy * 0.65 + Math.max(0, 100 - dueCards * 3) * 0.2 + Math.min(100, streakDays * 8) * 0.15;
  return Math.max(0, Math.min(100, Math.round(score)));
}
