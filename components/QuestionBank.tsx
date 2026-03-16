'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

type Question = {
  id: string;
  stem: string;
  explanation: string;
  difficulty: number;
  topic: { title: string; system: string };
  options: { id: string; label: string; text: string }[];
  correctOptionId: string | null;
};

const TIMER_SECS = 90;

export function QuestionBank({
  initialQuestions,
  bookmarkedIds: initialBookmarks = [],
  wrongIds: initialWrongIds = [],
}: {
  initialQuestions: Question[];
  bookmarkedIds?: string[];
  wrongIds?: string[];
}) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(initialBookmarks));
  const wrongSet = useMemo(() => new Set(initialWrongIds), [initialWrongIds]);

  const systems = useMemo(() => [...new Set(initialQuestions.map(q => q.topic.system))].sort(), [initialQuestions]);
  const topics  = useMemo(() => [...new Set(initialQuestions.map(q => q.topic.title))].sort(), [initialQuestions]);

  const [systemFilter, setSystemFilter] = useState('All');
  const [topicFilter,  setTopicFilter]  = useState('All');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [timedMode, setTimedMode] = useState(false);
  const [index,     setIndex]     = useState(0);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState('');
  const [aiExplain, setAiExplain] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [secsLeft, setSecsLeft] = useState(TIMER_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerFillRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = initialQuestions;
    if (showBookmarked)          list = list.filter(q => bookmarks.has(q.id));
    if (showWrong)               list = list.filter(q => wrongSet.has(q.id));
    if (systemFilter !== 'All')  list = list.filter(q => q.topic.system === systemFilter);
    if (topicFilter  !== 'All')  list = list.filter(q => q.topic.title  === topicFilter);
    return list;
  }, [systemFilter, topicFilter, showBookmarked, showWrong, initialQuestions, bookmarks, wrongSet]);

  const question = useMemo(() => filtered[index], [index, filtered]);

  function resetCard() {
    setSelected(null); setSubmitted(false); setIsCorrect(null);
    setExplanation(''); setAiExplain(''); setSecsLeft(TIMER_SECS);
  }

  // Timer logic
  const autoSubmit = useCallback(async () => {
    if (!question) return;
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, selected: selected ?? '__timeout__' }),
    });
    const data = await res.json();
    setSubmitted(true); setIsCorrect(data.isCorrect); setExplanation(question.explanation);
  }, [question, selected]);

  useEffect(() => {
    if (!timedMode || submitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          autoSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timedMode, submitted, question, autoSubmit]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!question) return;
      const numKey = parseInt(e.key);
      if (!submitted && numKey >= 1 && numKey <= question.options.length) {
        setSelected(question.options[numKey - 1].id);
      }
      if (e.key === 'Enter') {
        if (!submitted && selected) void handleSubmit();
        else if (submitted) handleNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function changeSystem(sys: string) {
    setSystemFilter(sys); setTopicFilter('All'); setShowBookmarked(false); setShowWrong(false); setIndex(0); resetCard();
  }
  function changeTopic(t: string) {
    setTopicFilter(t); setIndex(0); resetCard();
  }
  function toggleBookmarked() {
    setShowBookmarked(v => !v); setShowWrong(false); setSystemFilter('All'); setTopicFilter('All'); setIndex(0); resetCard();
  }
  function toggleWrong() {
    setShowWrong(v => !v); setShowBookmarked(false); setSystemFilter('All'); setTopicFilter('All'); setIndex(0); resetCard();
  }

  async function toggleBookmark(qId: string) {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qId }),
    });
    if (res.ok) {
      const data = await res.json();
      setBookmarks(prev => {
        const next = new Set(prev);
        data.bookmarked ? next.add(qId) : next.delete(qId);
        return next;
      });
    }
  }

  async function handleSubmit() {
    if (!selected || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, selected }),
    });
    const data = await res.json();
    setSubmitted(true); setIsCorrect(data.isCorrect); setExplanation(question.explanation);
  }

  function handleNext() {
    resetCard(); setIndex(i => (i + 1) % Math.max(1, filtered.length));
  }

  async function askAI() {
    if (!question) return;
    setAiLoading(true);
    const correctOpt = question.options.find(o => o.id === question.correctOptionId);
    const selectedOpt = question.options.find(o => o.id === selected);
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stem: question.stem,
        options: question.options.map(o => `${o.label}. ${o.text}`).join('\n'),
        correctAnswer: correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : '',
        selectedAnswer: selectedOpt ? `${selectedOpt.label}. ${selectedOpt.text}` : 'None (timed out)',
        explanation: question.explanation,
      }),
    });
    const data = await res.json();
    setAiExplain(data.explanation ?? 'Could not generate explanation.');
    setAiLoading(false);
  }

  if (filtered.length === 0) {
    return (
      <div className="panel">
        <p className="muted">No questions match the current filter.</p>
      </div>
    );
  }

  if (!question) return null;

  const isBookmarked = bookmarks.has(question.id);
  const timerPct = (secsLeft / TIMER_SECS) * 100;
  const timerWarn = secsLeft <= 20;

  useEffect(() => {
    timerFillRef.current?.style.setProperty('--w', `${timerPct}%`);
  }, [timerPct]);

  return (
    <div className="qb-wrap">

      {/* Filter bar */}
      <div className="qb-filter-bar">
        <div className="qb-filters">
          <button type="button" className={`qb-filter-pill${showBookmarked ? ' qb-filter-pill--active' : ''}`} onClick={toggleBookmarked}>
            🔖 Bookmarked ({bookmarks.size})
          </button>
          {wrongSet.size > 0 && (
            <button type="button" className={`qb-filter-pill qb-filter-pill--wrong${showWrong ? ' qb-filter-pill--active' : ''}`} onClick={toggleWrong}>
              ✗ Wrong ({wrongSet.size})
            </button>
          )}
          {['All', ...systems].map(sys => (
            <button key={sys} type="button"
              className={`qb-filter-pill${!showBookmarked && systemFilter === sys ? ' qb-filter-pill--active' : ''}`}
              onClick={() => changeSystem(sys)}
            >{sys}</button>
          ))}
        </div>
        <div className="qb-filter-right">
          <button
            type="button"
            className={`qb-timed-btn${timedMode ? ' qb-timed-btn--active' : ''}`}
            onClick={() => { setTimedMode(v => !v); resetCard(); }}
            title="Toggle 90-second per-question timer"
          >
            ⏱ {timedMode ? 'Timed ON' : 'Timed OFF'}
          </button>
          <span className="qb-filter-count">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Topic sub-filter */}
      {!showBookmarked && systemFilter !== 'All' && (
        <div className="qb-filter-bar qb-filter-bar--sub">
          <div className="qb-filters">
            {['All', ...topics.filter(t => initialQuestions.some(q => q.topic.system === systemFilter && q.topic.title === t))].map(t => (
              <button key={t} type="button"
                className={`qb-filter-pill qb-filter-pill--sm${topicFilter === t ? ' qb-filter-pill--active' : ''}`}
                onClick={() => changeTopic(t)}
              >{t}</button>
            ))}
          </div>
        </div>
      )}

      {/* Timer bar */}
      {timedMode && !submitted && (
        <div className={`qb-timer-bar${timerWarn ? ' qb-timer-bar--warn' : ''}`}>
          <div className="qb-timer-fill" ref={timerFillRef} />
          <span className="qb-timer-label">{secsLeft}s</span>
        </div>
      )}

      {/* Question card */}
      <div className="panel qb-card">
        <div className="qb-card-top">
          <span className="badge">{question.topic.system}</span>
          <span className="qb-card-badge">{question.topic.title}</span>
          <div className="qb-difficulty" title={`Difficulty ${question.difficulty}/5`}>
            {[1,2,3,4,5].map(d => (
              <span key={d} className={`qb-diff-dot${d <= question.difficulty ? ' qb-diff-dot--on' : ''}`} />
            ))}
          </div>
          <span className="qb-card-counter">{index + 1} / {filtered.length}</span>
          <button
            type="button"
            className={`qb-bookmark-btn${isBookmarked ? ' qb-bookmark-btn--active' : ''}`}
            onClick={() => toggleBookmark(question.id)}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            🔖
            <span className="qb-bookmark-label">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <p className="qb-stem">{question.stem}</p>

        <div className="list qb-options">
          {question.options.map((opt, oi) => {
            const classes = ['quiz-option'];
            if (selected === opt.id) classes.push('selected');
            if (submitted && opt.id === question.correctOptionId) classes.push('correct');
            if (submitted && selected === opt.id && opt.id !== question.correctOptionId) classes.push('wrong');
            return (
              <button key={opt.id} type="button" className={classes.join(' ')}
                onClick={() => !submitted && setSelected(opt.id)} disabled={submitted}>
                <strong>{opt.label}.</strong> {opt.text}
                {timedMode && !submitted && <span className="qb-option-key">{oi + 1}</span>}
              </button>
            );
          })}
        </div>

        <div className="qb-actions">
          <button type="button" className="btn primary" onClick={handleSubmit} disabled={!selected || submitted}>Submit</button>
          <button type="button" className="btn" onClick={handleNext}>Next →</button>
        </div>

        {submitted && (
          <div className={`qb-result${isCorrect ? ' qb-result--correct' : ' qb-result--wrong'}`}>
            <div className="qb-result-verdict">{isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
            <p className="qb-result-explanation">{explanation}</p>
            {!aiExplain && (
              <button type="button" className="btn qb-ai-btn" onClick={askAI} disabled={aiLoading}>
                {aiLoading ? 'Asking Claude…' : 'Ask Claude to explain'}
              </button>
            )}
            {aiExplain && (
              <div className="qb-ai-explain">
                <div className="qb-ai-explain-label">Claude&rsquo;s explanation</div>
                <p>{aiExplain}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
