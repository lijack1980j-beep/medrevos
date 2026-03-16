import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ExamSession } from '@/components/ExamSession';

export default async function ExamSessionPage({ params }: { params: { sessionId: string } }) {
  const user = await requireUser();
  const session = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        include: {
          question: {
            include: {
              options: { select: { id: true, label: true, text: true }, orderBy: { label: 'asc' } },
              topic:   { select: { title: true, system: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!session || session.userId !== user.id) redirect('/exam');
  if (session.status === 'COMPLETED') redirect(`/exam/${params.sessionId}/results`);

  const questions = session.answers.map(a => ({
    answerId:   a.id,
    questionId: a.question.id,
    stem:       a.question.stem,
    options:    a.question.options,
    topic:      a.question.topic,
  }));

  return (
    <ExamSession
      sessionId={params.sessionId}
      questions={questions}
      timeLimitSec={session.timeLimitSec}
      startedAt={session.startedAt.toISOString()}
    />
  );
}
