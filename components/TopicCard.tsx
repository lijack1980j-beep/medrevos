import Link from 'next/link';

type TopicCardTopic = {
  id: string;
  slug: string;
  title: string;
  system: string;
  summary: string;
  difficulty: number;
  estMinutes: number;
  highYield: boolean;
  _count?: { flashcards: number; questions: number };
};

export function TopicCard({ topic, mastery }: { topic: TopicCardTopic; mastery?: number }) {
  const diffHue = 120 - topic.difficulty * 24;
  const completed = (mastery ?? 0) >= 80;

  return (
    <div className={`topic-card topic-card-flex${completed ? ' topic-card--completed' : ''}`}>
      <div className="topic-card-badges">
        <span className="badge">{topic.system}</span>
        {topic.highYield && <span className="badge badge--hy">High Yield</span>}
        {completed && <span className="badge badge--done" title={`${mastery}% mastery`}>✓ Mastered</span>}
        {!completed && mastery !== undefined && mastery > 0 && (
          <span className="badge badge--progress">{mastery}%</span>
        )}
      </div>

      <h3 className="topic-card-title">{topic.title}</h3>
      <p className="muted topic-card-summary">{topic.summary}</p>

      {topic._count && (
        <div className="topic-card-counts">
          <span>{topic._count.questions} questions</span>
          <span className="topic-card-counts-dot">·</span>
          <span>{topic._count.flashcards} flashcards</span>
        </div>
      )}

      <div className="topic-card-meta">
        <span className="topic-card-diff muted">
          <span
            className="topic-card-diff-dot"
            style={{
              background: `hsl(${diffHue},70%,60%)`,
              boxShadow: `0 0 8px hsl(${diffHue},70%,60%)`,
            }}
          />
          Difficulty {topic.difficulty}/5
        </span>
        <span className="muted">{topic.estMinutes} min</span>
      </div>

      <Link className="btn secondary topic-card-btn" href={`/study?topic=${topic.slug}`}>
        Open topic
      </Link>
    </div>
  );
}
