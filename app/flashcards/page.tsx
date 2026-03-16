import Link from 'next/link';
import { prisma } from '@/lib/db';
import { FlashcardReviewClient } from '@/components/FlashcardReviewClient';
import { requireUser } from '@/lib/auth';

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: { topic?: string };
}) {
  const user = await requireUser();
  const selectedSlug = searchParams.topic ?? null;

  // All flashcards with their topic info
  const [allCards, states] = await Promise.all([
    prisma.flashcard.findMany({
      include: { topic: { select: { title: true, slug: true, system: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userFlashcardState.findMany({ where: { userId: user.id } }),
  ]);

  const stateMap = new Map(states.map(s => [s.flashcardId, s]));

  function isDue(cardId: string) {
    const s = stateMap.get(cardId);
    return !s || s.dueDate <= new Date();
  }

  // Build per-topic stats (all topics that have at least one card)
  const topicMap = new Map<string, { title: string; slug: string; system: string; total: number; due: number }>();
  for (const card of allCards) {
    const key = card.topic.slug;
    if (!topicMap.has(key)) {
      topicMap.set(key, { title: card.topic.title, slug: key, system: card.topic.system, total: 0, due: 0 });
    }
    const entry = topicMap.get(key)!;
    entry.total++;
    if (isDue(card.id)) entry.due++;
  }
  const topicList = [...topicMap.values()].sort((a, b) => b.due - a.due || a.title.localeCompare(b.title));

  // Cards for the current view
  const filteredCards = allCards.filter(c =>
    selectedSlug ? c.topic.slug === selectedSlug : true
  );
  const dueCards = filteredCards.filter(c => isDue(c.id)).slice(0, 40);

  const totalDue = allCards.filter(c => isDue(c.id)).length;
  const selectedTopic = selectedSlug ? topicMap.get(selectedSlug) : null;

  return (
    <div className="fc-page">

      {/* ── Topic sidebar ── */}
      <aside className="fc-sidebar">
        <div className="fc-sidebar-header">
          <span className="kicker">Filter by topic</span>
        </div>

        <Link
          href="/flashcards"
          className={`fc-topic-link${!selectedSlug ? ' fc-topic-link--active' : ''}`}
        >
          <span className="fc-topic-link-name">All topics</span>
          <span className={`fc-topic-link-due${totalDue > 0 ? ' fc-topic-link-due--has' : ''}`}>
            {totalDue}
          </span>
        </Link>

        {topicList.map(t => (
          <Link
            key={t.slug}
            href={`/flashcards?topic=${t.slug}`}
            className={`fc-topic-link${selectedSlug === t.slug ? ' fc-topic-link--active' : ''}`}
          >
            <div className="fc-topic-link-info">
              <span className="fc-topic-link-name">{t.title}</span>
              <span className="fc-topic-link-sys">{t.system}</span>
            </div>
            <span className={`fc-topic-link-due${t.due > 0 ? ' fc-topic-link-due--has' : ''}`}>
              {t.due}
            </span>
          </Link>
        ))}
      </aside>

      {/* ── Review area ── */}
      <main className="fc-main">
        <div className="fc-main-header center-text">
          <div className="kicker">Spaced repetition</div>
          <h1>{selectedTopic ? selectedTopic.title : 'Flashcard review'}</h1>
          <p className="muted">
            {selectedTopic
              ? `${dueCards.length} card${dueCards.length !== 1 ? 's' : ''} due in this topic`
              : `${totalDue} card${totalDue !== 1 ? 's' : ''} due across all topics`}
          </p>
        </div>

        {dueCards.length === 0 ? (
          <div className="fc-no-due panel">
            <p className="fc-no-due-emoji">✓</p>
            <h3>All caught up{selectedTopic ? ` in ${selectedTopic.title}` : ''}!</h3>
            <p className="muted">No cards due right now. Check back later or pick another topic.</p>
            {selectedSlug && (
              <Link href="/flashcards" className="btn secondary">
                Review all topics
              </Link>
            )}
          </div>
        ) : (
          <FlashcardReviewClient
            key={selectedSlug ?? 'all'}
            initialCards={dueCards.map(c => ({ ...c, dueDate: new Date().toISOString() }))}
          />
        )}
      </main>

    </div>
  );
}
