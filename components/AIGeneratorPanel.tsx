'use client';

import { useEffect, useRef, useState } from 'react';

type FlashcardResult = { front: string; back: string; note?: string };
type QuestionOption = { label: string; text: string; isCorrect: boolean };
type QuestionResult = { stem: string; explanation: string; difficulty: number; options: QuestionOption[] };
type GenerateResult = { flashcards: FlashcardResult[]; questions: QuestionResult[] };

const LOADING_MESSAGES = [
  'Analyzing your text…',
  'Identifying key concepts…',
  'Generating flashcards…',
  'Crafting clinical questions…',
  'Structuring content…',
  'Almost there…',
];

export function AIGeneratorPanel({ topics }: { topics: { id: string; title: string }[] }) {
  const [text, setText]                   = useState('');
  const [topicId, setTopicId]             = useState(topics[0]?.id ?? '');
  const [flashcardCount, setFlashcardCount] = useState(5);
  const [questionCount, setQuestionCount] = useState(3);
  const [step, setStep]                   = useState<'input' | 'loading' | 'preview' | 'saved'>('input');
  const [loadingMsg, setLoadingMsg]       = useState(LOADING_MESSAGES[0]);
  const [results, setResults]             = useState<GenerateResult | null>(null);
  const [keptFlashcards, setKeptFlashcards] = useState<Set<number>>(new Set());
  const [keptQuestions, setKeptQuestions] = useState<Set<number>>(new Set());
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [savedCounts, setSavedCounts]     = useState({ flashcards: 0, questions: 0 });
  const [genError, setGenError]           = useState('');
  const fileRef                           = useRef<HTMLInputElement>(null);
  const timerRef                          = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 'loading') {
      let i = 1;
      timerRef.current = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[i % LOADING_MESSAGES.length]);
        i++;
      }, 2200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  function toggleFlashcard(i: number) {
    setKeptFlashcards(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function toggleQuestion(i: number) {
    setKeptQuestions(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function toggleAllFlashcards() {
    if (!results) return;
    const allKept = results.flashcards.every((_, i) => keptFlashcards.has(i));
    setKeptFlashcards(allKept ? new Set() : new Set(results.flashcards.map((_, i) => i)));
  }

  function toggleAllQuestions() {
    if (!results) return;
    const allKept = results.questions.every((_, i) => keptQuestions.has(i));
    setKeptQuestions(allKept ? new Set() : new Set(results.questions.map((_, i) => i)));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(reader.result as string);
    reader.readAsText(file);
    e.target.value = '';
  }

  async function generate() {
    if (text.length < 50 || (flashcardCount === 0 && questionCount === 0)) return;
    setGenError('');
    setStep('loading');
    setLoadingMsg(LOADING_MESSAGES[0]);
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, flashcardCount, questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed.');
      setResults(data);
      setKeptFlashcards(new Set((data.flashcards as FlashcardResult[]).map((_, i) => i)));
      setKeptQuestions(new Set((data.questions as QuestionResult[]).map((_, i) => i)));
      setStep('preview');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('input');
    }
  }

  async function save() {
    if (!results || !topicId) return;
    setSaving(true);
    setSaveError('');
    let fcSaved = 0, qSaved = 0, failed = 0;

    for (const fc of results.flashcards.filter((_, i) => keptFlashcards.has(i))) {
      const r = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'flashcard', topicId, front: fc.front, back: fc.back, note: fc.note ?? '' }),
      });
      if (r.ok) fcSaved++; else failed++;
    }

    for (const q of results.questions.filter((_, i) => keptQuestions.has(i))) {
      const correctOpt = q.options.find(o => o.isCorrect);
      const r = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'question', topicId,
          stem: q.stem, explanation: q.explanation, difficulty: q.difficulty,
          optionA: q.options.find(o => o.label === 'A')?.text ?? '',
          optionB: q.options.find(o => o.label === 'B')?.text ?? '',
          optionC: q.options.find(o => o.label === 'C')?.text ?? '',
          optionD: q.options.find(o => o.label === 'D')?.text ?? '',
          correctLabel: (correctOpt?.label ?? 'A') as 'A' | 'B' | 'C' | 'D',
        }),
      });
      if (r.ok) qSaved++; else failed++;
    }

    setSaving(false);
    setSavedCounts({ flashcards: fcSaved, questions: qSaved });

    if (failed > 0) {
      setSaveError(`${fcSaved + qSaved} saved, ${failed} failed. Check the console for details.`);
    } else {
      setStep('saved');
    }
  }

  function reset() {
    setStep('input');
    setText('');
    setResults(null);
    setSaveError('');
    setSavedCounts({ flashcards: 0, questions: 0 });
  }

  const totalKept   = keptFlashcards.size + keptQuestions.size;
  const wordCount   = text.trim().split(/\s+/).filter(Boolean).length;
  const topicTitle  = topics.find(t => t.id === topicId)?.title ?? '—';

  return (
    <div className="panel aig-panel">

      {/* Header */}
      <div className="aig-header">
        <div className="kicker">AI-powered</div>
        <h3 className="aig-title">Content Generator</h3>
        <p className="muted">Paste notes or upload a file — Claude extracts high-yield flashcards and MCQ questions, then saves them straight to the student pages.</p>
      </div>

      {/* ── Destination info bar ── */}
      {step !== 'saved' && (
        <div className="aig-dest-bar">
          <div className="aig-dest-item">
            <span className="aig-dest-icon">🃏</span>
            <div>
              <div className="aig-dest-label">Flashcards</div>
              <div className="aig-dest-page">→ Flashcards page (SRS queue)</div>
            </div>
          </div>
          <div className="aig-dest-sep" />
          <div className="aig-dest-item">
            <span className="aig-dest-icon">📝</span>
            <div>
              <div className="aig-dest-label">Questions</div>
              <div className="aig-dest-page">→ Q-Bank (question practice)</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      {step === 'input' && (
        <div className="aig-body">
          <div className="aig-text-section">
            <div className="aig-text-label">
              <span>Source text</span>
              {text.length > 0 && (
                <span className="aig-text-meta">{wordCount} words · {text.length.toLocaleString()} chars</span>
              )}
            </div>
            <textarea
              className="aig-textarea"
              placeholder="Paste lecture notes, textbook excerpts, clinical guidelines, or any study material…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
            />
            <label className="aig-upload-label">
              <svg className="aig-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload .txt / .md file
              <input ref={fileRef} type="file" accept=".txt,.md,.text" onChange={handleFileUpload} hidden />
            </label>
          </div>

          <div className="aig-config-row">
            <div className="aig-field">
              <label>Target topic</label>
              <select className="aig-select" value={topicId} onChange={e => setTopicId(e.target.value)}>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="aig-field">
              <label>🃏 Flashcards</label>
              <div className="aig-counter">
                <button type="button" onClick={() => setFlashcardCount(n => Math.max(0, n - 1))} disabled={flashcardCount === 0}>−</button>
                <span className="aig-counter-value">{flashcardCount}</span>
                <button type="button" onClick={() => setFlashcardCount(n => Math.min(20, n + 1))} disabled={flashcardCount === 20}>+</button>
              </div>
            </div>

            <div className="aig-field">
              <label>📝 Questions</label>
              <div className="aig-counter">
                <button type="button" onClick={() => setQuestionCount(n => Math.max(0, n - 1))} disabled={questionCount === 0}>−</button>
                <span className="aig-counter-value">{questionCount}</span>
                <button type="button" onClick={() => setQuestionCount(n => Math.min(10, n + 1))} disabled={questionCount === 10}>+</button>
              </div>
            </div>

            <button
              type="button"
              className="btn primary aig-generate-btn"
              onClick={generate}
              disabled={text.length < 50 || (flashcardCount === 0 && questionCount === 0)}
            >
              <svg className="aig-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate
            </button>
          </div>

          {genError && <p className="aig-error">{genError}</p>}
          {text.length > 0 && text.length < 50 && (
            <p className="aig-hint">Add more text (at least 50 characters) to generate content.</p>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {step === 'loading' && (
        <div className="aig-loading">
          <div className="aig-spinner" />
          <div className="aig-loading-title">{loadingMsg}</div>
          <p className="aig-loading-note">Claude is reading your material</p>
        </div>
      )}

      {/* ── Preview ── */}
      {step === 'preview' && results && (
        <>
          <div className="aig-preview">

            {/* Flashcards */}
            {results.flashcards.length > 0 && (
              <div>
                <div className="aig-section-header">
                  <div className="aig-section-header-left">
                    <span className="aig-section-title">🃏 Flashcards</span>
                    <span className="aig-section-count">{keptFlashcards.size} / {results.flashcards.length} selected</span>
                    <span className="aig-section-dest">→ Flashcards page</span>
                  </div>
                  <button type="button" className="aig-toggle-all" onClick={toggleAllFlashcards}>
                    {results.flashcards.every((_, i) => keptFlashcards.has(i)) ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="aig-cards-grid">
                  {results.flashcards.map((fc, i) => {
                    const kept = keptFlashcards.has(i);
                    return (
                      <div
                        key={i}
                        className={`aig-card ${kept ? 'aig-card--kept' : 'aig-card--discarded'}`}
                        onClick={() => toggleFlashcard(i)}
                      >
                        <span className="aig-card-check">{kept ? '✓' : '○'}</span>
                        <div className="aig-card-front">Prompt</div>
                        <div className="aig-card-text">{fc.front}</div>
                        <div className="aig-card-back">{fc.back}</div>
                        {fc.note && <div className="aig-card-note">💡 {fc.note}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Questions */}
            {results.questions.length > 0 && (
              <div>
                <div className="aig-section-header">
                  <div className="aig-section-header-left">
                    <span className="aig-section-title">📝 MCQ Questions</span>
                    <span className="aig-section-count">{keptQuestions.size} / {results.questions.length} selected</span>
                    <span className="aig-section-dest">→ Q-Bank</span>
                  </div>
                  <button type="button" className="aig-toggle-all" onClick={toggleAllQuestions}>
                    {results.questions.every((_, i) => keptQuestions.has(i)) ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="aig-questions-list">
                  {results.questions.map((q, i) => {
                    const kept = keptQuestions.has(i);
                    return (
                      <div
                        key={i}
                        className={`aig-question ${kept ? 'aig-question--kept' : 'aig-question--discarded'}`}
                        onClick={() => toggleQuestion(i)}
                      >
                        <div className="aig-question-meta">
                          <span className="aig-question-diff">Difficulty {q.difficulty}/5</span>
                          <span className="aig-question-check">{kept ? '✓' : '○'}</span>
                        </div>
                        <p className="aig-question-stem">{q.stem}</p>
                        <div className="aig-options">
                          {q.options.map(opt => (
                            <div key={opt.label} className={`aig-option ${opt.isCorrect ? 'aig-option--correct' : ''}`}>
                              <span className="aig-option-label">{opt.label}</span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                        <div className="aig-explanation">
                          <span className="aig-explanation-label">Explanation:</span>
                          {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="aig-save-bar">
            <div className="aig-save-left">
              <button type="button" className="btn aig-back-btn" onClick={() => setStep('input')}>← Back</button>
              {saveError && <span className="aig-status aig-status--err">{saveError}</span>}
            </div>
            <div className="aig-save-right">
              <div className="aig-save-summary">
                <span className="aig-save-info">
                  <strong>{keptFlashcards.size}</strong> flashcard{keptFlashcards.size !== 1 ? 's' : ''} → Flashcards page
                </span>
                <span className="aig-save-divider">·</span>
                <span className="aig-save-info">
                  <strong>{keptQuestions.size}</strong> question{keptQuestions.size !== 1 ? 's' : ''} → Q-Bank
                </span>
                <span className="aig-save-divider">·</span>
                <span className="aig-save-info">Topic: <strong>{topicTitle}</strong></span>
              </div>
              <button
                type="button"
                className="btn primary aig-save-btn"
                onClick={save}
                disabled={saving || totalKept === 0}
              >
                {saving ? 'Saving…' : `Save ${totalKept} item${totalKept !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Saved confirmation ── */}
      {step === 'saved' && (
        <div className="aig-saved">
          <div className="aig-saved-icon">✓</div>
          <h3 className="aig-saved-title">Content saved!</h3>
          <p className="aig-saved-sub">Under topic: <strong>{topicTitle}</strong></p>

          <div className="aig-saved-destinations">
            {savedCounts.flashcards > 0 && (
              <a href="/flashcards" target="_blank" rel="noopener noreferrer" className="aig-saved-link">
                <span className="aig-saved-link-icon">🃏</span>
                <div>
                  <div className="aig-saved-link-count">{savedCounts.flashcards} flashcard{savedCounts.flashcards !== 1 ? 's' : ''}</div>
                  <div className="aig-saved-link-page">View in Flashcards page →</div>
                </div>
              </a>
            )}
            {savedCounts.questions > 0 && (
              <a href="/questions" target="_blank" rel="noopener noreferrer" className="aig-saved-link">
                <span className="aig-saved-link-icon">📝</span>
                <div>
                  <div className="aig-saved-link-count">{savedCounts.questions} question{savedCounts.questions !== 1 ? 's' : ''}</div>
                  <div className="aig-saved-link-page">View in Q-Bank →</div>
                </div>
              </a>
            )}
          </div>

          <button type="button" className="btn primary" onClick={reset}>
            Generate more content
          </button>
        </div>
      )}
    </div>
  );
}
