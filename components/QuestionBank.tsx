'use client';

import { useMemo, useState } from 'react';

type Question = {
  id: string;
  stem: string;
  explanation: string;
  topic: { title: string; system: string };
  options: { id: string; label: string; text: string }[];
  correctOptionId: string | null;
};

export function QuestionBank({
  initialQuestions,
  bookmarkedIds: initialBookmarks = [],
}: {
  initialQuestions: Question[];
  bookmarkedIds?: string[];
}) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(initialBookmarks));

  const systems = useMemo(() => [...new Set(initialQuestions.map(q => q.topic.system))].sort(), [initialQuestions]);
  const topics  = useMemo(() => [...new Set(initialQuestions.map(q => q.topic.title))].sort(), [initialQuestions]);

  const [systemFilter, setSystemFilter] = useState('All');
  const [topicFilter,  setTopicFilter]  = useState('All');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [index,     setIndex]     = useState(0);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState('');

  const filtered = useMemo(() => {
    let list = initialQuestions;
    if (showBookmarked)          list = list.filter(q => bookmarks.has(q.id));
    if (systemFilter !== 'All')  list = list.filter(q => q.topic.system === systemFilter);
    if (topicFilter  !== 'All')  list = list.filter(q => q.topic.title  === topicFilter);
    return list;
  }, [systemFilter, topicFilter, showBookmarked, initialQuestions, bookmarks]);

  const question = useMemo(() => filtered[index], [index, filtered]);

  function resetCard() {
    setSelected(null); setSubmitted(false); setIsCorrect(null); setExplanation('');
  }

  function changeSystem(sys: string) {
    setSystemFilter(sys); setTopicFilter('All'); setShowBookmarked(false); setIndex(0); resetCard();
  }
  function changeTopic(t: string) {
    setTopicFilter(t); setIndex(0); resetCard();
  }
  function toggleBookmarked() {
    setShowBookmarked(v => !v); setSystemFilter('All'); setTopicFilter('All'); setIndex(0); resetCard();
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

  async function submit() {
    if (!selected || !question) return;
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, selected }),
    });
    const data = await res.json();
    setSubmitted(true); setIsCorrect(data.isCorrect); setExplanation(question.explanation);
  }

  function next() {
    resetCard(); setIndex(i => (i + 1) % Math.max(1, filtered.length));
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

  return (
    <div className="qb-wrap">

      {/* System filter */}
      <div className="qb-filter-bar">
        <div className="qb-filters">
          <button type="button" className={`qb-filter-pill${showBookmarked ? ' qb-filter-pill--active' : ''}`} onClick={toggleBookmarked}>
            🔖 Bookmarked ({bookmarks.size})
          </button>
          {['All', ...systems].map(sys => (
            <button key={sys} type="button"
              className={`qb-filter-pill${!showBookmarked && systemFilter === sys ? ' qb-filter-pill--active' : ''}`}
              onClick={() => changeSystem(sys)}
            >{sys}</button>
          ))}
        </div>
        <span className="qb-filter-count">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
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

      {/* Question card */}
      <div className="panel qb-card">
        <div className="qb-card-top">
          <span className="badge">{question.topic.system}</span>
          <span className="qb-card-badge">{question.topic.title}</span>
          <span className="qb-card-counter">{index + 1} / {filtered.length}</span>
          <button
            type="button"
            className={`qb-bookmark-btn${isBookmarked ? ' qb-bookmark-btn--active' : ''}`}
            onClick={() => toggleBookmark(question.id)}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            {isBookmarked ? '🔖' : '🔖'}
            <span className="qb-bookmark-label">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <p className="qb-stem">{question.stem}</p>

        <div className="list qb-options">
          {question.options.map(opt => {
            const classes = ['quiz-option'];
            if (selected === opt.id) classes.push('selected');
            if (submitted && opt.id === question.correctOptionId) classes.push('correct');
            if (submitted && selected === opt.id && opt.id !== question.correctOptionId) classes.push('wrong');
            return (
              <button key={opt.id} type="button" className={classes.join(' ')}
                onClick={() => !submitted && setSelected(opt.id)} disabled={submitted}>
                <strong>{opt.label}.</strong> {opt.text}
              </button>
            );
          })}
        </div>

        <div className="qb-actions">
          <button type="button" className="btn primary" onClick={submit} disabled={!selected || submitted}>Submit</button>
          <button type="button" className="btn" onClick={next}>Next →</button>
        </div>

        {submitted && (
          <div className={`qb-result${isCorrect ? ' qb-result--correct' : ' qb-result--wrong'}`}>
            <div className="qb-result-verdict">{isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
            <p className="qb-result-explanation">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
