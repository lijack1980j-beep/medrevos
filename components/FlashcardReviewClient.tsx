'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { StreakConfetti } from '@/components/StreakConfetti';
import { FcProgressFill } from '@/components/FcProgressFill';

const ratings = ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const;
type Rating = (typeof ratings)[number];

const ratingClass: Record<Rating, string> = {
  AGAIN: 'fc-rating-btn fc-rating-btn--again',
  HARD:  'fc-rating-btn fc-rating-btn--hard',
  GOOD:  'fc-rating-btn fc-rating-btn--good',
  EASY:  'fc-rating-btn fc-rating-btn--easy',
};

const ratingLabel: Record<Rating, { emoji: string; label: string }> = {
  AGAIN: { emoji: '✕', label: 'Again' },
  HARD:  { emoji: '〜', label: 'Hard' },
  GOOD:  { emoji: '✓', label: 'Good' },
  EASY:  { emoji: '⚡', label: 'Easy' },
};

type Card = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  topic: { title: string };
  dueDate: string;
  intervalDays?: number;
  easeFactor?: number;
  repetitions?: number;
};

export function FlashcardReviewClient({ initialCards, freeMode = false }: { initialCards: Card[]; freeMode?: boolean }) {
  const [cards, setCards] = useState(initialCards);
  const [showBack, setShowBack] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const total = useRef(initialCards.length);
  total.current = initialCards.length; // sync when key causes remount with new initialCards
  const current = useMemo(() => cards[0], [cards]);
  const flipTimer1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipTimer2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up pending flip timers on unmount
  useEffect(() => {
    return () => {
      if (flipTimer1.current) clearTimeout(flipTimer1.current);
      if (flipTimer2.current) clearTimeout(flipTimer2.current);
    };
  }, []);

  const done = total.current - cards.length;
  const progress = total.current > 0 ? (done / total.current) * 100 : 0;

  async function review(rating: Rating) {
    if (!current || reviewing) return;
    const cardId = current.id;
    setReviewing(true);
    if (!freeMode) {
      try {
        await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flashcardId: cardId, rating }),
        });
      } catch {
        // Network error — still advance
      }
    }
    setShowBack(false);
    setIsFlipping(false);
    setReviewing(false);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  function handleReveal() {
    if (flipTimer1.current) clearTimeout(flipTimer1.current);
    if (flipTimer2.current) clearTimeout(flipTimer2.current);
    setIsFlipping(true);
    flipTimer1.current = setTimeout(() => setShowBack(true), 200);
    flipTimer2.current = setTimeout(() => setIsFlipping(false), 400);
  }

  /* ── Completion screen ── */
  if (!current) {
    const milestone = [7, 14, 30].some(m => total.current >= m);
    return (
      <>
        <StreakConfetti trigger={milestone} />
        <div className="fc-complete">
          <div className="fc-complete-orb" />
          <div className="fc-complete-emoji">🎉</div>
          <h3 className="fc-complete-title">All caught up!</h3>
          <p className="fc-complete-text">
            You cleared all {total.current} due card{total.current !== 1 ? 's' : ''}.
            Seed more or check back when new reviews are due.
          </p>
        </div>
      </>
    );
  }

  const cardClass = [
    'flashcard-card fc-card',
    showBack ? 'fc-card--answer' : '',
    isFlipping ? 'fc-card--flipping' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="fc-wrapper">

      {/* Progress bar */}
      <div className="fc-progress-row">
        <div className="fc-progress-track">
          <FcProgressFill pct={progress} />
        </div>
        <span className="fc-progress-count">
          {done} <span>/</span> {total.current}
        </span>
      </div>

      {/* Card */}
      <div className={cardClass}>

        {/* Topic + counter */}
        <div className="fc-card-top">
          <span className="badge">{current.topic.title}</span>
          <span className="fc-card-count">{cards.length} left</span>
        </div>

        {/* Prompt / Answer label */}
        <div className={`fc-label ${showBack ? 'fc-label--answer' : 'fc-label--prompt'}`}>
          {showBack ? 'Answer' : 'Prompt'}
        </div>

        {/* Content */}
        <p className={`fc-content ${showBack ? 'fc-content--answer' : ''}`}>
          {showBack ? current.back : current.front}
        </p>

        {/* Note */}
        {showBack && current.note ? (
          <div className="fc-note">{current.note}</div>
        ) : null}

        {/* SRS stats */}
        {showBack && (current.intervalDays !== undefined || current.repetitions !== undefined) && (
          <div className="fc-stats-row">
            <span className="fc-stat" title="Current interval">
              <span className="fc-stat-label">Interval</span>
              <span className="fc-stat-value">{current.intervalDays ?? 0}d</span>
            </span>
            <span className="fc-stat" title="Ease factor">
              <span className="fc-stat-label">Ease</span>
              <span className="fc-stat-value">{((current.easeFactor ?? 2.5) * 100).toFixed(0)}%</span>
            </span>
            <span className="fc-stat" title="Number of reviews">
              <span className="fc-stat-label">Reviews</span>
              <span className="fc-stat-value">{current.repetitions ?? 0}</span>
            </span>
          </div>
        )}

        <div className="fc-divider" />

        {/* Actions */}
        <div className="fc-actions">
          {!showBack ? (
            <button type="button" className="btn primary fc-reveal-btn" onClick={handleReveal}>
              Reveal Answer
            </button>
          ) : (
            ratings.map((rating) => {
              const { emoji, label } = ratingLabel[rating];
              return (
                <button
                  key={rating}
                  type="button"
                  className={`${ratingClass[rating]}${reviewing ? ' fc-rating-btn--pending' : ''}`}
                  onClick={() => review(rating)}
                  disabled={reviewing}
                >
                  <span className="fc-rating-icon">{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
