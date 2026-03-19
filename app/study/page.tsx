export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { checkAccess } from '@/lib/access';
import { TopicNoteEditor } from '@/components/TopicNoteEditor';

export default async function StudyPage({ searchParams }: { searchParams?: { topic?: string } }) {
  const user = await getCurrentUser();
  checkAccess(user, 'study');

  const [topics, progressRows] = await Promise.all([
    prisma.topic.findMany({
      where: { OR: [{ assignedToUserId: null }, { assignedToUserId: user!.id }] },
      select: {
        id: true, slug: true, title: true, system: true, summary: true,
        difficulty: true, estMinutes: true, highYield: true,
        _count: { select: { flashcards: true, questions: true } },
      },
      orderBy: [{ highYield: 'desc' }, { title: 'asc' }],
    }),
    user
      ? prisma.userTopicProgress.findMany({ where: { userId: user.id }, select: { topicId: true, masteryPercent: true } })
      : Promise.resolve([]),
  ]);

  const progressMap: Record<string, number> = Object.fromEntries(progressRows.map(p => [p.topicId, p.masteryPercent]));

  const active = searchParams?.topic
    ? topics.find(t => t.slug === searchParams.topic)
    : topics[0];

  let lesson = null;
  let noteContent = '';
  if (active) {
    const [lessonRow, noteRow] = await Promise.all([
      prisma.lesson.findFirst({ where: { topicId: active.id }, orderBy: { createdAt: 'asc' } }),
      user ? prisma.topicNote.findUnique({ where: { userId_topicId: { userId: user.id, topicId: active.id } } }) : null,
    ]);
    lesson = lessonRow;
    noteContent = noteRow?.content ?? '';
  }

  return (
    <div className="study-page">
      <div>
        <div className="kicker">Topic library</div>
        <h1>Study mode</h1>
        <p className="muted">Select a topic to read the high-yield lesson, then drill questions or review flashcards.</p>
      </div>

      <div className="study-layout">

        {/* Sidebar */}
        <div className="panel study-sidebar">
          <div className="study-sidebar-title">Topics</div>
          <nav className="study-sidebar-list">
            {topics.map(t => {
              const mastery = progressMap[t.id] ?? 0;
              return (
                <Link
                  key={t.id}
                  href={`/study?topic=${t.slug}`}
                  className={`study-topic-link${t.slug === active?.slug ? ' study-topic-link--active' : ''}`}
                >
                  <div className="study-topic-link-main">
                    <span className="study-topic-link-name">{t.title}</span>
                    {t.highYield && <span className="study-hy-dot" title="High yield" />}
                  </div>
                  <div className="study-topic-link-bottom">
                    <span className="study-topic-link-meta">{t._count.questions}Q · {t._count.flashcards}FC</span>
                    {mastery > 0 && (
                      <span className={`study-mastery-pill${mastery >= 80 ? ' study-mastery-pill--good' : mastery >= 50 ? ' study-mastery-pill--ok' : ' study-mastery-pill--low'}`}>
                        {mastery}%
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        {active ? (
          <div className="study-content">

            {lesson ? (
              <div className="panel study-lesson">
                <div className="study-lesson-top">
                  <span className="badge">{active.system}</span>
                  {active.highYield && <span className="badge badge--hy">High Yield</span>}
                </div>
                <h2 className="study-lesson-title">{lesson.title}</h2>
                <p className="study-lesson-body">{lesson.content}</p>

                <div className="study-frame">
                  <div className="study-frame-col">
                    <div className="study-frame-label">Pearls</div>
                    <p className="study-frame-text">{lesson.pearls}</p>
                  </div>
                  <div className="study-frame-col">
                    <div className="study-frame-label">Pitfalls</div>
                    <p className="study-frame-text">{lesson.pitfalls}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel study-lesson">
                <div className="study-lesson-top">
                  <span className="badge">{active.system}</span>
                  {active.highYield && <span className="badge badge--hy">High Yield</span>}
                </div>
                <h2 className="study-lesson-title">{active.title}</h2>
                {active.summary && <p className="study-lesson-body">{active.summary}</p>}
                <p className="muted study-no-lesson">No lesson added for this topic yet.</p>
              </div>
            )}

            {user && (
              <TopicNoteEditor
                key={active.id}
                topicId={active.id}
                initialContent={noteContent}
              />
            )}

            <div className="study-actions">
              <Link href={`/questions?topic=${active.slug}`} className="btn primary study-action-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Practice {active._count.questions} Questions
              </Link>
              <Link href={`/flashcards?topic=${active.slug}`} className="btn secondary study-action-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Review {active._count.flashcards} Flashcards
              </Link>
              <div className="study-action-stat">
                <span>{active.estMinutes} min</span>
                <span className="study-action-dot">·</span>
                <span>Difficulty {active.difficulty}/5</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="panel study-empty">
            <p className="muted">Select a topic from the list to start studying.</p>
          </div>
        )}

      </div>
    </div>
  );
}