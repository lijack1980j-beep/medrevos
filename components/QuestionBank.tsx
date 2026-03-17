'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

type Question = {
  id: string;
  stem: string;
  explanation: string;
  difficulty: number;
  imageUrl?: string | null;
  topic: { title: string; system: string };
  options: { id: string; label: string; text: string }[];
  correctOptionId: string | null;
};

type SRSState = { questionId: string; dueDate: string; intervalDays: number; easeFactor: number; repetitions: number };
type SortMode = 'default' | 'smart' | 'hard' | 'easy';
const TIMER_SECS = 90;

export function QuestionBank({
  initialQuestions,
  bookmarkedIds: initialBookmarks = [],
  wrongIds: initialWrongIds = [],
  attemptedIds = [],
  accuracyMap = {},
  srsStates = [],
}: {
  initialQuestions: Question[];
  bookmarkedIds?: string[];
  wrongIds?: string[];
  attemptedIds?: string[];
  accuracyMap?: Record<string, number>;
  srsStates?: SRSState[];
}) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(initialBookmarks));
  const wrongSet     = useMemo(() => new Set(initialWrongIds), [initialWrongIds]);
  const attemptedSet = useMemo(() => new Set(attemptedIds), [attemptedIds]);
  const srsMap       = useMemo(() => new Map(srsStates.map(s => [s.questionId, s])), [srsStates]);
  const now          = useMemo(() => new Date(), []);
  const srsDueIds    = useMemo(() => new Set(srsStates.filter(s => new Date(s.dueDate) <= now).map(s => s.questionId)), [srsStates, now]);

  const systems = useMemo(() => [...new Set(initialQuestions.map(q => q.topic.system))].sort(), [initialQuestions]);
  const topics  = useMemo(() => [...new Set(initialQuestions.map(q => q.topic.title))].sort(), [initialQuestions]);

  const [systemFilter,    setSystemFilter]    = useState('All');
  const [topicFilter,     setTopicFilter]     = useState('All');
  const [showBookmarked,  setShowBookmarked]  = useState(false);
  const [showWrong,       setShowWrong]       = useState(false);
  const [showSRS,         setShowSRS]         = useState(false);
  const [sortMode,        setSortMode]        = useState<SortMode>('default');
  const [timedMode,       setTimedMode]       = useState(false);
  const [index,           setIndex]           = useState(0);
  const [selected,        setSelected]        = useState<string | null>(null);
  const [submitted,       setSubmitted]       = useState(false);
  const [isCorrect,       setIsCorrect]       = useState<boolean | null>(null);
  const [explanation,     setExplanation]     = useState('');
  const [aiExplain,       setAiExplain]       = useState('');
  const [aiLoading,       setAiLoading]       = useState(false);
  const [mnemonic,        setMnemonic]        = useState('');
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [secsLeft,        setSecsLeft]        = useState(TIMER_SECS);
  const [srsDone,         setSrsDone]         = useState<Map<string, string>>(new Map());
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerFillRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = initialQuestions;
    if (showBookmarked) list = list.filter(q => bookmarks.has(q.id));
    if (showWrong)      list = list.filter(q => wrongSet.has(q.id));
    if (showSRS)        list = list.filter(q => srsDueIds.has(q.id));
    if (systemFilter !== 'All') list = list.filter(q => q.topic.system === systemFilter);
    if (topicFilter  !== 'All') list = list.filter(q => q.topic.title  === topicFilter);
    if (sortMode === 'smart') {
      list = [...list].sort((a, b) => {
        const wa = wrongSet.has(a.id) ? -2 : !attemptedSet.has(a.id) ? -1 : 0;
        const wb = wrongSet.has(b.id) ? -2 : !attemptedSet.has(b.id) ? -1 : 0;
        if (wa !== wb) return wa - wb;
        return (accuracyMap[a.id] ?? 50) - (accuracyMap[b.id] ?? 50);
      });
    } else if (sortMode === 'hard') {
      list = [...list].sort((a, b) => b.difficulty - a.difficulty);
    } else if (sortMode === 'easy') {
      list = [...list].sort((a, b) => a.difficulty - b.difficulty);
    }
    return list;
  }, [systemFilter, topicFilter, showBookmarked, showWrong, showSRS, sortMode, initialQuestions, bookmarks, wrongSet, srsDueIds, attemptedSet, accuracyMap]);

  const question = useMemo(() => filtered[index], [index, filtered]);

  function resetCard() {
    setSelected(null); setSubmitted(false); setIsCorrect(null);
    setExplanation(''); setAiExplain(''); setMnemonic(''); setSecsLeft(TIMER_SECS);
  }

  const autoSubmit = useCallback(async () => {
    if (!question) return;
    const res = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: question.id, selected: selected ?? '__timeout__' }) });
    const data = await res.json();
    setSubmitted(true); setIsCorrect(data.isCorrect); setExplanation(question.explanation);
  }, [question, selected]);

  useEffect(() => {
    if (!timedMode || submitted) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSecsLeft(s => { if (s <= 1) { clearInterval(timerRef.current!); autoSubmit(); return 0; } return s - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timedMode, submitted, question, autoSubmit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!question) return;
      const n = parseInt(e.key);
      if (!submitted && n >= 1 && n <= question.options.length) setSelected(question.options[n - 1].id);
      if (e.key === 'Enter') { if (!submitted && selected) void handleSubmit(); else if (submitted) handleNext(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => { timerFillRef.current?.style.setProperty('--w', `${(secsLeft / TIMER_SECS) * 100}%`); }, [secsLeft]);

  function changeSystem(sys: string) { setSystemFilter(sys); setTopicFilter('All'); setShowBookmarked(false); setShowWrong(false); setShowSRS(false); setIndex(0); resetCard(); }
  function changeTopic(t: string)    { setTopicFilter(t); setIndex(0); resetCard(); }
  function toggleBookmarked() { setShowBookmarked(v => !v); setShowWrong(false); setShowSRS(false); setSystemFilter('All'); setTopicFilter('All'); setIndex(0); resetCard(); }
  function toggleWrong()      { setShowWrong(v => !v); setShowBookmarked(false); setShowSRS(false); setSystemFilter('All'); setTopicFilter('All'); setIndex(0); resetCard(); }
  function toggleSRS()        { setShowSRS(v => !v); setShowBookmarked(false); setShowWrong(false); setSystemFilter('All'); setTopicFilter('All'); setIndex(0); resetCard(); }

  async function toggleBookmark(qId: string) {
    const res = await fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: qId }) });
    if (res.ok) { const data = await res.json(); setBookmarks(prev => { const n = new Set(prev); data.bookmarked ? n.add(qId) : n.delete(qId); return n; }); }
  }

  async function handleSubmit() {
    if (!selected || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const res = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: question.id, selected }) });
    const data = await res.json();
    setSubmitted(true); setIsCorrect(data.isCorrect); setExplanation(question.explanation);
  }

  function handleNext() { resetCard(); setIndex(i => (i + 1) % Math.max(1, filtered.length)); }

  async function rateSRS(rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') {
    if (!question) return;
    await fetch('/api/questions/srs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: question.id, rating }) });
    setSrsDone(prev => new Map(prev).set(question.id, rating));
  }

  async function askAI() {
    if (!question) return;
    setAiLoading(true);
    const co = question.options.find(o => o.id === question.correctOptionId);
    const so = question.options.find(o => o.id === selected);
    const res = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stem: question.stem, options: question.options.map(o => `${o.label}. ${o.text}`).join('\n'), correctAnswer: co ? `${co.label}. ${co.text}` : '', selectedAnswer: so ? `${so.label}. ${so.text}` : 'None', explanation: question.explanation }) });
    const data = await res.json();
    setAiExplain(data.explanation ?? '');
    setAiLoading(false);
  }

  async function generateMnemonic() {
    if (!question) return;
    setMnemonicLoading(true);
    const res = await fetch('/api/mnemonic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: question.topic.title, concept: question.stem.slice(0, 120) }) });
    const data = await res.json();
    setMnemonic(data.mnemonic ?? '');
    setMnemonicLoading(false);
  }

  if (filtered.length === 0) return <div className="panel"><p className="muted">No questions match the current filter.</p></div>;
  if (!question) return null;

  const isBookmarked = bookmarks.has(question.id);
  const srsState     = srsMap.get(question.id);
  const srsRated     = srsDone.get(question.id);

  return (
    <div className="qb-wrap">
      <div className="qb-filter-bar">
        <div className="qb-filters">
          <button type="button" className={`qb-filter-pill${showBookmarked ? ' qb-filter-pill--active' : ''}`} onClick={toggleBookmarked}>Bookmarked ({bookmarks.size})</button>
          {wrongSet.size > 0 && <button type="button" className={`qb-filter-pill qb-filter-pill--wrong${showWrong ? ' qb-filter-pill--active' : ''}`} onClick={toggleWrong}>Wrong ({wrongSet.size})</button>}
          {srsDueIds.size > 0 && <button type="button" className={`qb-filter-pill qb-filter-pill--srs${showSRS ? ' qb-filter-pill--active' : ''}`} onClick={toggleSRS}>SRS due ({srsDueIds.size})</button>}
          {['All', ...systems].map(sys => (
            <button key={sys} type="button" className={`qb-filter-pill${!showBookmarked && !showWrong && !showSRS && systemFilter === sys ? ' qb-filter-pill--active' : ''}`} onClick={() => changeSystem(sys)}>{sys}</button>
          ))}
        </div>
        <div className="qb-filter-right">
          <select className="qb-sort-select" title="Sort questions" value={sortMode} onChange={e => { setSortMode(e.target.value as SortMode); setIndex(0); resetCard(); }}>
            <option value="default">Default</option>
            <option value="smart">Smart (weak first)</option>
            <option value="hard">Hard first</option>
            <option value="easy">Easy first</option>
          </select>
          <button type="button" className={`qb-timed-btn${timedMode ? ' qb-timed-btn--active' : ''}`} onClick={() => { setTimedMode(v => !v); resetCard(); }}>Timer {timedMode ? 'ON' : 'OFF'}</button>
          <span className="qb-filter-count">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {!showBookmarked && !showWrong && !showSRS && systemFilter !== 'All' && (
        <div className="qb-filter-bar qb-filter-bar--sub">
          <div className="qb-filters">
            {['All', ...topics.filter(t => initialQuestions.some(q => q.topic.system === systemFilter && q.topic.title === t))].map(t => (
              <button key={t} type="button" className={`qb-filter-pill qb-filter-pill--sm${topicFilter === t ? ' qb-filter-pill--active' : ''}`} onClick={() => changeTopic(t)}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {timedMode && !submitted && (
        <div className={`qb-timer-bar${secsLeft <= 20 ? ' qb-timer-bar--warn' : ''}`}>
          <div className="qb-timer-fill" ref={timerFillRef} />
          <span className="qb-timer-label">{secsLeft}s</span>
        </div>
      )}

      <div className="panel qb-card">
        <div className="qb-card-top">
          <span className="badge">{question.topic.system}</span>
          <span className="qb-card-badge">{question.topic.title}</span>
          <div className="qb-difficulty">
            {[1,2,3,4,5].map(d => <span key={d} className={`qb-diff-dot${d <= question.difficulty ? ' qb-diff-dot--on' : ''}`} />)}
          </div>
          {srsState && <span className="qb-srs-badge">SRS {srsState.intervalDays}d</span>}
          <span className="qb-card-counter">{index + 1} / {filtered.length}</span>
          <button type="button" className={`qb-bookmark-btn${isBookmarked ? ' qb-bookmark-btn--active' : ''}`} onClick={() => toggleBookmark(question.id)}>
            <span className="qb-bookmark-label">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {question.imageUrl && (
          <div className="qb-image-wrap">
            <img src={question.imageUrl} alt="Question image" className="qb-image" />
          </div>
        )}

        <p className="qb-stem">{question.stem}</p>

        <div className="list qb-options">
          {question.options.map((opt, oi) => {
            const cls = ['quiz-option', selected === opt.id ? 'selected' : '', submitted && opt.id === question.correctOptionId ? 'correct' : '', submitted && selected === opt.id && opt.id !== question.correctOptionId ? 'wrong' : ''].filter(Boolean).join(' ');
            return (
              <button key={opt.id} type="button" className={cls} onClick={() => !submitted && setSelected(opt.id)} disabled={submitted}>
                <strong>{opt.label}.</strong> {opt.text}
                {timedMode && !submitted && <span className="qb-option-key">{oi + 1}</span>}
              </button>
            );
          })}
        </div>

        <div className="qb-actions">
          <button type="button" className="btn primary" onClick={handleSubmit} disabled={!selected || submitted}>Submit</button>
          <button type="button" className="btn" onClick={handleNext}>Next</button>
        </div>

        {submitted && (
          <div className={`qb-result${isCorrect ? ' qb-result--correct' : ' qb-result--wrong'}`}>
            <div className="qb-result-verdict">{isCorrect ? 'Correct' : 'Incorrect'}</div>
            <p className="qb-result-explanation">{explanation}</p>
            {!srsRated ? (
              <div className="qb-srs-row">
                <span className="qb-srs-label">Schedule review:</span>
                {(['AGAIN','HARD','GOOD','EASY'] as const).map(r => (
                  <button key={r} type="button" className={`qb-srs-btn qb-srs-btn--${r.toLowerCase()}`} onClick={() => rateSRS(r)}>{r}</button>
                ))}
              </div>
            ) : (
              <p className="qb-srs-rated">Scheduled as <strong>{srsRated}</strong></p>
            )}
            <div className="qb-ai-row">
              {!aiExplain && <button type="button" className="btn qb-ai-btn" onClick={askAI} disabled={aiLoading}>{aiLoading ? 'Asking Claude...' : 'Ask Claude to explain'}</button>}
              {!mnemonic && <button type="button" className="btn qb-mnemonic-btn" onClick={generateMnemonic} disabled={mnemonicLoading}>{mnemonicLoading ? 'Generating...' : 'Mnemonic'}</button>}
            </div>
            {aiExplain && <div className="qb-ai-explain"><div className="qb-ai-explain-label">Claude explanation</div><p>{aiExplain}</p></div>}
            {mnemonic && <div className="qb-mnemonic-box"><div className="qb-mnemonic-label">Mnemonic</div><p className="qb-mnemonic-text">{mnemonic}</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}
