export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { FlashcardReviewClient } from '@/components/FlashcardReviewClient';
import { CustomFlashcardForm } from '@/components/CustomFlashcardForm';
import { requireUser } from '@/lib/auth';
import { checkAccess } from '@/lib/access';

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: { topic?: string; mode?: string };
}) {
  const user = await requireUser();
  checkAccess(user, 'flashcards');
  const selectedSlug = searchParams.topic ?? null;
  const freeMode = searchParams.mode === 'free';

  // All flashcards with their topic info
  const [allCards, states, allTopics] = await Promise.all([
    prisma.flashcard.findMany({
      where: { topic: { OR: [{ assignedToUserId: null }, { assignedToUserId: user.id }] } },
      include: { topic: { select: { title: true, slug: true, system: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userFlashcardState.findMany({ where: { userId: user.id } }),
    prisma.topic.findMany({ where: { OR: [{ assignedToUserId: null }, { assignedToUserId: user.id }] }, select: { id: true, title: true, system: true }, orderBy: { title: 'asc' } }),
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
  const dueCards = freeMode
    ? filteredCards.slice(0, 60)
    : filteredCards.filter(c => isDue(c.id)).slice(0, 40);

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
          <div className="kicker">{freeMode ? 'Free review' : 'Spaced repetition'}</div>
          <h1>{selectedTopic ? selectedTopic.title : 'Flashcard review'}</h1>
          <p className="muted">
            {freeMode
              ? `${dueCards.length} card${dueCards.length !== 1 ? 's' : ''} — reviewing all, no scheduling`
              : selectedTopic
                ? `${dueCards.length} card${dueCards.length !== 1 ? 's' : ''} due in this topic`
                : `${totalDue} card${totalDue !== 1 ? 's' : ''} due across all topics`}
          </p>
          <div className="fc-mode-toggle">
            <Link href={`/flashcards${selectedSlug ? `?topic=${selectedSlug}` : ''}` as any} className={`fc-mode-btn${!freeMode ? ' fc-mode-btn--active' : ''}`}>SRS</Link>
            <Link href={`/flashcards?${selectedSlug ? `topic=${selectedSlug}&` : ''}mode=free` as any} className={`fc-mode-btn${freeMode ? ' fc-mode-btn--active' : ''}`}>Free review</Link>
          </div>
        </div>

        {dueCards.length === 0 ? (
          <div className="fc-no-due panel">
            <div className="fc-no-due-emoji">✓</div>
            <h3>All caught up{selectedTopic ? ` in ${selectedTopic.title}` : ''}!</h3>
            <p className="muted">No cards due right now. Switch to Free review to practice anyway, or pick another topic.</p>
            <div className="fc-no-due-actions">
              <Link href={`/flashcards?${selectedSlug ? `topic=${selectedSlug}&` : ''}mode=free`} className="btn primary">Free review</Link>
              {selectedSlug && <Link href="/flashcards" className="btn secondary">All topics</Link>}
            </div>
          </div>
        ) : (
          <FlashcardReviewClient
            key={`${selectedSlug ?? 'all'}-${freeMode ? 'free' : 'srs'}`}
            initialCards={dueCards.map(c => {
              const s = stateMap.get(c.id);
              return {
                ...c,
                dueDate: (s?.dueDate ?? new Date()).toISOString(),
                intervalDays: s?.intervalDays ?? 0,
                easeFactor: s?.easeFactor ?? 2.5,
                repetitions: s?.repetitions ?? 0,
              };
            })}
            freeMode={freeMode}
          />
        )}
        <div className="fc-custom-section">
          <div className="fc-custom-header">
            <span className="kicker">Your cards</span>
            <h3>Custom flashcards</h3>
            <p className="muted">Create your own cards — they appear in your SRS queue like any other card.</p>
          </div>
          <CustomFlashcardForm topics={allTopics} />
        </div>
      </main>

    </div>
  );
}