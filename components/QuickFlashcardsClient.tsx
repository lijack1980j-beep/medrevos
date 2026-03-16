'use client';

import { useState, useEffect, useCallback } from 'react';

type Card = { front: string; back: string };
type Phase = 'input' | 'loading' | 'review' | 'done';
type StudyMode = 'flip' | 'mcq' | 'recall' | 'spaced';
type MCQOption = { text: string; isCorrect: boolean };

const PRESETS = [
  'Beta blocker pharmacology',
  'Renal physiology',
  'Cardiac arrhythmias',
  'Antibiotic mechanisms',
  'Coagulation cascade',
  'Autoimmune diseases',
  'Diabetes complications',
  'Neuroanatomy pathways',
  'Acid-base disorders',
  'Adrenal physiology',
];

const MODES: { key: StudyMode; label: string; desc: string }[] = [
  { key: 'flip',   label: 'Flip cards',       desc: 'Classic front/back reveal' },
  { key: 'mcq',    label: 'Multiple choice',   desc: 'Pick the correct answer from options' },
  { key: 'recall', label: 'Recall',            desc: 'Type your answer, then compare' },
  { key: 'spaced', label: 'Spaced review',     desc: 'Rate each card — hard ones repeat' },
];

function makeMCQOptions(cards: Card[], idx: number): MCQOption[] {
  const correct = cards[idx].back;
  const pool = cards.filter((_, i) => i !== idx).map(c => c.back).sort(() => Math.random() - 0.5).slice(0, 3);
  return [{ text: correct, isCorrect: true }, ...pool.map(t => ({ text: t, isCorrect: false }))].sort(() => Math.random() - 0.5);
}

export function QuickFlashcardsClient() {
  const [phase, setPhase]   = useState<Phase>('input');
  const [prompt, setPrompt] = useState('');
  const [count, setCount]   = useState(10);
  const [cards, setCards]   = useState<Card[]>([]);
  const [error, setError]   = useState('');
  const [mode, setMode]     = useState<StudyMode>('flip');

  // ── Flip / recall shared ──
  const [current, setCurrent]     = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [flipping, setFlipping]   = useState(false);
  const [known, setKnown]         = useState<Set<number>>(new Set());

  // ── MCQ ──
  const [mcqOptions, setMcqOptions]   = useState<MCQOption[]>([]);
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqCorrect, setMcqCorrect]   = useState(0);

  // ── Recall ──
  const [recallInput, setRecallInput]       = useState('');
  const [recallRevealed, setRecallRevealed] = useState(false);

  // ── Spaced rep ──
  const [spacedQueue, setSpacedQueue]     = useState<number[]>([]);
  const [spacedDone, setSpacedDone]       = useState(0);
  const [spacedFlipped, setSpacedFlipped] = useState(false);
  const [spacedFlipping, setSpacedFlipping] = useState(false);

  // ── Export ──
  const [topics, setTopics]         = useState<{ slug: string; title: string }[]>([]);
  const [exportSlug, setExportSlug] = useState('');
  const [exporting, setExporting]   = useState(false);
  const [exported, setExported]     = useState(false);

  // Load topics for export
  useEffect(() => {
    fetch('/api/topics').then(r => r.json()).then((data: { slug: string; title: string }[]) => {
      setTopics(data);
      if (data.length > 0) setExportSlug(data[0].slug);
    }).catch(() => {});
  }, []);

  async function exportToDeck() {
    if (!exportSlug || exporting) return;
    setExporting(true);
    await fetch('/api/quick/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicSlug: exportSlug, cards }),
    });
    setExporting(false);
    setExported(true);
  }

  // Auto-advance spaced mode when queue empties
  useEffect(() => {
    if (phase === 'review' && mode === 'spaced' && spacedQueue.length === 0 && spacedDone > 0) {
      setPhase('done');
    }
  }, [spacedQueue.length, phase, mode, spacedDone]);

  // ── Keyboard shortcuts ──
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (phase !== 'review') return;
    if (mode === 'flip') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doFlip(); }
      if (e.key === 'ArrowRight') flipNext();
      if (e.key === 'ArrowLeft')  flipPrev();
      if ((e.key === 'g' || e.key === 'G') && flipped) markKnown();
    }
    if (mode === 'spaced') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doSpacedFlip(); }
      if (spacedFlipped) {
        if (e.key === '1') rateSpaced('again');
        if (e.key === '2') rateSpaced('hard');
        if (e.key === '3') rateSpaced('good');
        if (e.key === '4') rateSpaced('easy');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, flipped, current, cards.length, spacedFlipped]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // ── Card flip helpers ──
  function doFlip() {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => { setFlipped(f => !f); setFlipping(false); }, 140);
  }

  function doSpacedFlip() {
    if (spacedFlipping) return;
    setSpacedFlipping(true);
    setTimeout(() => { setSpacedFlipped(f => !f); setSpacedFlipping(false); }, 140);
  }

  // ── Reset all review state ──
  function resetReview(c: Card[]) {
    setCurrent(0);
    setFlipped(false);
    setKnown(new Set());
    setMcqOptions(c.length > 0 ? makeMCQOptions(c, 0) : []);
    setMcqSelected(null);
    setMcqCorrect(0);
    setRecallInput('');
    setRecallRevealed(false);
    setSpacedQueue(c.map((_, i) => i));
    setSpacedDone(0);
    setSpacedFlipped(false);
  }

  // ── Generate ──
  async function generate() {
    if (prompt.trim().length < 2) return;
    setError('');
    setPhase('loading');
    try {
      const res  = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setCards(data.cards);
      resetReview(data.cards);
      setPhase('review');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('input');
    }
  }

  // ── Flip mode navigation ──
  function flipNext() {
    if (current < cards.length - 1) {
      setFlipped(false);
      setCurrent(c => c + 1);
    } else {
      setPhase('done');
    }
  }

  function flipPrev() {
    if (current > 0) { setFlipped(false); setCurrent(c => c - 1); }
  }

  function markKnown() { setKnown(k => new Set([...k, current])); flipNext(); }

  // ── MCQ ──
  function selectMCQ(i: number) {
    if (mcqSelected !== null) return;
    setMcqSelected(i);
    if (mcqOptions[i].isCorrect) setMcqCorrect(c => c + 1);
  }

  function nextMCQ() {
    if (current < cards.length - 1) {
      const next = current + 1;
      setCurrent(next);
      setMcqOptions(makeMCQOptions(cards, next));
      setMcqSelected(null);
    } else {
      setPhase('done');
    }
  }

  // ── Recall ──
  function nextRecall() {
    setRecallInput('');
    setRecallRevealed(false);
    if (current < cards.length - 1) setCurrent(c => c + 1);
    else setPhase('done');
  }

  function prevRecall() {
    if (current > 0) { setRecallInput(''); setRecallRevealed(false); setCurrent(c => c - 1); }
  }

  function markRecallKnown() { setKnown(k => new Set([...k, current])); nextRecall(); }

  // ── Spaced rep ──
  function rateSpaced(rating: 'again' | 'hard' | 'good' | 'easy') {
    setSpacedQueue(q => {
      const [head, ...rest] = q;
      if (rating === 'again') return [...rest, head];
      if (rating === 'hard') {
        const at = Math.min(3, rest.length);
        return [...rest.slice(0, at), head, ...rest.slice(at)];
      }
      return rest; // good / easy → remove
    });
    if (rating === 'good' || rating === 'easy') setSpacedDone(d => d + 1);
    setSpacedFlipped(false);
  }

  // ── Restart / new topic ──
  function restart() { resetReview(cards); setPhase('review'); }
  function newTopic() { setPhase('input'); setPrompt(''); setCards([]); }

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="qfc-page">
        <div className="qfc-loading">
          <div className="qfc-spinner" />
          <p className="qfc-loading-title">Generating {count} flashcards…</p>
          <p className="qfc-loading-sub">Topic: <em>{prompt}</em></p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const { score, label } = (() => {
      if (mode === 'mcq')    return { score: percent(mcqCorrect, cards.length),  label: `${mcqCorrect} of ${cards.length} correct` };
      if (mode === 'spaced') return { score: percent(spacedDone, cards.length),  label: `${spacedDone} of ${cards.length} mastered` };
      return                        { score: percent(known.size, cards.length),  label: `${known.size} of ${cards.length} marked known` };
    })();
    const scoreClass = score >= 80 ? 'qfc-done-score--great' : score >= 50 ? 'qfc-done-score--ok' : 'qfc-done-score--low';
    return (
      <div className="qfc-page">
        <div className="panel qfc-done">
          <div className={`qfc-done-score ${scoreClass}`}>{score}%</div>
          <h2 className="qfc-done-title">Session complete</h2>
          <p className="muted">{label}</p>
          <div className="qfc-done-actions">
            <button type="button" className="btn primary" onClick={restart}>Review again</button>
            <button type="button" className="btn secondary" onClick={newTopic}>New topic</button>
          </div>
          {mode === 'spaced' && spacedQueue.length > 0 && (
            <p className="muted qfc-done-hint">{spacedQueue.length} card{spacedQueue.length !== 1 ? 's' : ''} still in the queue — review again to clear them.</p>
          )}
          {(mode === 'flip' || mode === 'recall') && known.size < cards.length && (
            <p className="muted qfc-done-hint">{cards.length - known.size} card{cards.length - known.size !== 1 ? 's' : ''} still to master — try again.</p>
          )}
          {topics.length > 0 && !exported && (
            <div className="qfc-export">
              <div className="qfc-export-label">Save cards to your main deck</div>
              <div className="qfc-export-row">
                <select className="qfc-export-select" value={exportSlug} onChange={e => setExportSlug(e.target.value)} title="Select topic to save cards to" aria-label="Select topic">
                  {topics.map(t => <option key={t.slug} value={t.slug}>{t.title}</option>)}
                </select>
                <button type="button" className="btn primary qfc-export-btn" onClick={exportToDeck} disabled={exporting}>
                  {exporting ? 'Saving…' : `Save ${cards.length} cards`}
                </button>
              </div>
            </div>
          )}
          {exported && <p className="qfc-export-saved">Cards saved to your deck!</p>}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEW — MULTIPLE CHOICE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'review' && mode === 'mcq') {
    const card = cards[current];
    const pct  = Math.round((current / cards.length) * 100);
    return (
      <div className="qfc-page">
        <div className="qfc-review">
          <div className="qfc-topbar">
            <button type="button" className="btn qfc-back-btn" onClick={newTopic}>← New topic</button>
            <div className="qfc-progress-row">
              <progress className="qfc-progress-bar" value={pct} max={100} />
              <span className="qfc-progress-label">{current + 1} / {cards.length}</span>
            </div>
            <span className="qfc-known-count">{mcqCorrect} correct</span>
          </div>

          <div className="qfc-mcq-question panel">
            <div className="qfc-card-side-label">Question</div>
            <div className="qfc-mcq-text">{card.front}</div>
          </div>

          <div className="qfc-mcq-options">
            {mcqOptions.map((opt, i) => {
              let cls = 'qfc-mcq-option';
              if (mcqSelected !== null) {
                if (opt.isCorrect)          cls += ' qfc-mcq-option--correct';
                else if (i === mcqSelected) cls += ' qfc-mcq-option--wrong';
                else                        cls += ' qfc-mcq-option--dim';
              }
              return (
                <button key={i} type="button" className={cls} onClick={() => selectMCQ(i)} disabled={mcqSelected !== null}>
                  <span className="qfc-mcq-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="qfc-mcq-option-text">{opt.text}</span>
                  {mcqSelected !== null && opt.isCorrect       && <span className="qfc-mcq-icon qfc-mcq-icon--ok">✓</span>}
                  {mcqSelected !== null && i === mcqSelected && !opt.isCorrect && <span className="qfc-mcq-icon qfc-mcq-icon--wrong">✗</span>}
                </button>
              );
            })}
          </div>

          {mcqSelected !== null && (
            <div className="qfc-actions">
              <button type="button" className="btn primary" onClick={nextMCQ}>
                {current < cards.length - 1 ? 'Next →' : 'Finish'}
              </button>
            </div>
          )}

          <div className="qfc-kbd-hints">
            {mcqOptions.map((_, i) => (
              <span key={i}><span className="qfc-kbd">{i + 1}</span></span>
            ))}
            {' '}to select
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEW — RECALL
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'review' && mode === 'recall') {
    const card = cards[current];
    const pct  = Math.round((current / cards.length) * 100);
    return (
      <div className="qfc-page">
        <div className="qfc-review">
          <div className="qfc-topbar">
            <button type="button" className="btn qfc-back-btn" onClick={newTopic}>← New topic</button>
            <div className="qfc-progress-row">
              <progress className="qfc-progress-bar" value={pct} max={100} />
              <span className="qfc-progress-label">{current + 1} / {cards.length}</span>
            </div>
            <span className="qfc-known-count">{known.size} known</span>
          </div>

          <div className="qfc-recall-question panel">
            <div className="qfc-card-side-label">Question</div>
            <div className="qfc-recall-text">{card.front}</div>
          </div>

          {!recallRevealed ? (
            <>
              <textarea
                className="qfc-recall-input"
                placeholder="Type your answer here…"
                value={recallInput}
                onChange={e => setRecallInput(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="qfc-actions">
                <button type="button" className="btn" onClick={prevRecall} disabled={current === 0}>← Prev</button>
                <button type="button" className="btn primary" onClick={() => setRecallRevealed(true)}>Reveal answer</button>
                <button type="button" className="btn" onClick={nextRecall}>Skip →</button>
              </div>
            </>
          ) : (
            <>
              <div className="qfc-recall-compare">
                {recallInput.trim() && (
                  <div className="qfc-recall-block">
                    <div className="qfc-recall-block-label">Your answer</div>
                    <div className="qfc-recall-block-text">{recallInput}</div>
                  </div>
                )}
                <div className="qfc-recall-block qfc-recall-block--correct">
                  <div className="qfc-recall-block-label">Correct answer</div>
                  <div className="qfc-recall-block-text">{card.back}</div>
                </div>
              </div>
              <div className="qfc-actions">
                <button type="button" className="btn qfc-btn-learning" onClick={nextRecall}>Still learning</button>
                <button type="button" className="btn primary qfc-btn-got-it" onClick={markRecallKnown}>Got it ✓</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEW — SPACED REP
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'review' && mode === 'spaced') {
    if (spacedQueue.length === 0) return null;
    const card = cards[spacedQueue[0]];
    const pct  = Math.round((spacedDone / cards.length) * 100);
    return (
      <div className="qfc-page">
        <div className="qfc-review">
          <div className="qfc-topbar">
            <button type="button" className="btn qfc-back-btn" onClick={newTopic}>← New topic</button>
            <div className="qfc-progress-row">
              <progress className="qfc-progress-bar" value={pct} max={100} />
              <span className="qfc-progress-label">{spacedDone} mastered</span>
            </div>
            <span className="qfc-known-count">{spacedQueue.length} left</span>
          </div>

          <div className={`qfc-card-wrap${spacedFlipping ? ' qfc-card-wrap--flipping' : ''}`} onClick={doSpacedFlip}>
            <div className="qfc-card panel">
              <div className={`qfc-card-side-label${spacedFlipped ? ' qfc-card-side-label--answer' : ''}`}>
                {spacedFlipped ? 'Answer' : 'Question'}
              </div>
              <div className="qfc-card-body">{spacedFlipped ? card.back : card.front}</div>
              <div className="qfc-card-hint">{spacedFlipped ? 'How well did you recall this?' : 'Click or press Space to reveal'}</div>
            </div>
          </div>

          {spacedFlipped ? (
            <div className="qfc-spaced-ratings">
              <button type="button" className="qfc-spaced-btn qfc-spaced-btn--again" onClick={() => rateSpaced('again')}>
                <span className="qfc-spaced-key">1</span>
                <span className="qfc-spaced-name">Again</span>
                <span className="qfc-spaced-sub">forgot it</span>
              </button>
              <button type="button" className="qfc-spaced-btn qfc-spaced-btn--hard" onClick={() => rateSpaced('hard')}>
                <span className="qfc-spaced-key">2</span>
                <span className="qfc-spaced-name">Hard</span>
                <span className="qfc-spaced-sub">struggled</span>
              </button>
              <button type="button" className="qfc-spaced-btn qfc-spaced-btn--good" onClick={() => rateSpaced('good')}>
                <span className="qfc-spaced-key">3</span>
                <span className="qfc-spaced-name">Good</span>
                <span className="qfc-spaced-sub">recalled</span>
              </button>
              <button type="button" className="qfc-spaced-btn qfc-spaced-btn--easy" onClick={() => rateSpaced('easy')}>
                <span className="qfc-spaced-key">4</span>
                <span className="qfc-spaced-name">Easy</span>
                <span className="qfc-spaced-sub">instant</span>
              </button>
            </div>
          ) : (
            <div className="qfc-actions">
              <button type="button" className="btn primary" onClick={doSpacedFlip}>Reveal answer</button>
            </div>
          )}

          <div className="qfc-kbd-hints">
            <span className="qfc-kbd">Space</span> flip
            {spacedFlipped && (
              <>{' '}<span className="qfc-kbd">1</span> again {' '}<span className="qfc-kbd">2</span> hard {' '}<span className="qfc-kbd">3</span> good {' '}<span className="qfc-kbd">4</span> easy</>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEW — FLIP (classic)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const card    = cards[current];
    const pct     = Math.round((current / cards.length) * 100);
    const isKnown = known.has(current);
    return (
      <div className="qfc-page">
        <div className="qfc-review">
          <div className="qfc-topbar">
            <button type="button" className="btn qfc-back-btn" onClick={newTopic}>← New topic</button>
            <div className="qfc-progress-row">
              <progress className="qfc-progress-bar" value={pct} max={100} />
              <span className="qfc-progress-label">{current + 1} / {cards.length}</span>
            </div>
            <span className="qfc-known-count">{known.size} known</span>
          </div>

          <div className={`qfc-card-wrap${flipping ? ' qfc-card-wrap--flipping' : ''}`} onClick={doFlip}>
            <div className={`qfc-card panel${isKnown ? ' qfc-card--known' : ''}`}>
              <div className={`qfc-card-side-label${flipped ? ' qfc-card-side-label--answer' : ''}`}>
                {flipped ? 'Answer' : 'Question'}
              </div>
              <div className="qfc-card-body">{flipped ? card.back : card.front}</div>
              <div className="qfc-card-hint">{flipped ? 'Click to see question again' : 'Click or press Space to reveal'}</div>
            </div>
          </div>

          <div className="qfc-actions">
            {flipped ? (
              <>
                <button type="button" className="btn qfc-btn-learning" onClick={flipNext}>Still learning</button>
                <button type="button" className="btn primary qfc-btn-got-it" onClick={markKnown}>Got it ✓</button>
              </>
            ) : (
              <>
                <button type="button" className="btn" onClick={flipPrev} disabled={current === 0}>← Prev</button>
                <button type="button" className="btn primary" onClick={doFlip}>Reveal answer</button>
                <button type="button" className="btn" onClick={flipNext}>Skip →</button>
              </>
            )}
          </div>

          <div className="qfc-kbd-hints">
            <span className="qfc-kbd">Space</span> flip
            <span className="qfc-kbd">→</span> next
            <span className="qfc-kbd">←</span> prev
            {flipped && <><span className="qfc-kbd">G</span> got it</>}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="qfc-page">
      <div className="qfc-header">
        <div className="kicker">AI-powered · session only</div>
        <h1>Quick Flashcards</h1>
        <p className="muted">
          Type a topic or paste your notes — Claude generates a focused set of high-yield cards
          instantly. These cards exist only for this session and never appear in your main flashcard deck.
        </p>
      </div>

      <div className="panel qfc-input-panel">

        <textarea
          className="qfc-textarea"
          placeholder="e.g. Beta blocker pharmacology, paste your lecture notes (any length), or 'USMLE high-yield renal pathology'…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate(); }}
        />

        {/* Preset topics */}
        <div className="qfc-presets">
          <span className="qfc-presets-label">Quick topics:</span>
          <div className="qfc-preset-list">
            {PRESETS.map(p => (
              <button
                key={p}
                type="button"
                className={`qfc-preset-btn${prompt === p ? ' qfc-preset-btn--active' : ''}`}
                onClick={() => setPrompt(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Study mode */}
        <div className="qfc-modes">
          <span className="qfc-config-label">Study mode:</span>
          <div className="qfc-mode-grid">
            {MODES.map(m => (
              <button
                key={m.key}
                type="button"
                className={`qfc-mode-btn${mode === m.key ? ' qfc-mode-btn--active' : ''}`}
                onClick={() => setMode(m.key)}
              >
                <span className="qfc-mode-label">{m.label}</span>
                <span className="qfc-mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Count selector */}
        <div className="qfc-config-row">
          <span className="qfc-config-label">Cards to generate:</span>
          <div className="qfc-count-pills">
            {[5, 10, 15, 20].map(n => (
              <button
                key={n}
                type="button"
                className={`qfc-count-pill${count === n ? ' qfc-count-pill--active' : ''}`}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="qfc-error">{error}</p>}

        <button
          type="button"
          className="btn primary qfc-generate-btn"
          onClick={generate}
          disabled={prompt.trim().length < 2}
        >
          Generate {count} flashcards →
        </button>
        <p className="muted qfc-generate-hint">Ctrl + Enter to generate</p>
      </div>
    </div>
  );
}

function percent(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}
