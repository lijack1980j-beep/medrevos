export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();

  const [topics, questions, flashcards, cases] = q.length >= 2 ? await Promise.all([
    prisma.topic.findMany({
      where: { OR: [{ title: { contains: q } }, { system: { contains: q } }, { summary: { contains: q } }] },
      select: { title: true, slug: true, system: true, summary: true },
      take: 8,
    }),
    prisma.question.findMany({
      where: { stem: { contains: q } },
      select: { id: true, stem: true, topic: { select: { title: true, system: true } } },
      take: 8,
    }),
    prisma.flashcard.findMany({
      where: { OR: [{ front: { contains: q } }, { back: { contains: q } }] },
      select: { id: true, front: true, back: true, topic: { select: { title: true } } },
      take: 8,
    }),
    prisma.caseStudy.findMany({
      where: { OR: [{ title: { contains: q } }, { chiefComplaint: { contains: q } }, { diagnosis: { contains: q } }] },
      select: { id: true, title: true, topic: { select: { title: true, system: true } } },
      take: 6,
    }),
  ]) : [[], [], [], []];

  const total = topics.length + questions.length + flashcards.length + cases.length;

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="kicker">Global search</div>
        <h1>Search</h1>
        <form method="GET" action="/search" className="search-form">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search topics, questions, flashcards, cases…"
            className="search-input"
            autoFocus
          />
          <button type="submit" className="btn primary">Search</button>
        </form>
        {q.length >= 2 && <p className="muted search-count">{total} result{total !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;</p>}
      </div>

      {q.length >= 2 && total === 0 && (
        <div className="panel search-empty">
          <p className="muted">No results found. Try a different search term.</p>
        </div>
      )}

      {topics.length > 0 && (
        <section className="search-section">
          <div className="search-section-title">Topics <span className="search-section-count">{topics.length}</span></div>
          <div className="search-results">
            {topics.map(t => (
              <Link key={t.slug} href={`/study?topic=${t.slug}`} className="search-result-card">
                <div className="search-result-top">
                  <span className="badge">{t.system}</span>
                  <span className="search-result-type">Topic</span>
                </div>
                <div className="search-result-title">{t.title}</div>
                <div className="search-result-sub muted">{t.summary}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section className="search-section">
          <div className="search-section-title">Questions <span className="search-section-count">{questions.length}</span></div>
          <div className="search-results">
            {questions.map(q2 => (
              <Link key={q2.id} href="/questions" className="search-result-card">
                <div className="search-result-top">
                  <span className="badge">{q2.topic.system}</span>
                  <span className="search-result-type">MCQ</span>
                </div>
                <div className="search-result-title">{q2.stem.length > 120 ? q2.stem.slice(0, 120) + '…' : q2.stem}</div>
                <div className="search-result-sub muted">{q2.topic.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {flashcards.length > 0 && (
        <section className="search-section">
          <div className="search-section-title">Flashcards <span className="search-section-count">{flashcards.length}</span></div>
          <div className="search-results">
            {flashcards.map(f => (
              <Link key={f.id} href="/flashcards" className="search-result-card">
                <div className="search-result-top">
                  <span className="badge">{f.topic.title}</span>
                  <span className="search-result-type">Flashcard</span>
                </div>
                <div className="search-result-title">{f.front}</div>
                <div className="search-result-sub muted">{f.back}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cases.length > 0 && (
        <section className="search-section">
          <div className="search-section-title">Cases <span className="search-section-count">{cases.length}</span></div>
          <div className="search-results">
            {cases.map(c => (
              <Link key={c.id} href="/cases" className="search-result-card">
                <div className="search-result-top">
                  <span className="badge">{c.topic.system}</span>
                  <span className="search-result-type">Case</span>
                </div>
                <div className="search-result-title">{c.title}</div>
                <div className="search-result-sub muted">{c.topic.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}