import { prisma } from '@/lib/db';
import { percent } from '@/lib/analytics';

export async function updateTopicProgress(userId: string, topicId: string) {
  const attempts = await prisma.questionAttempt.findMany({ where: { userId, question: { topicId } }, include: { question: true } });
  const questionCount = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const masteryPercent = percent(correctCount, questionCount);
  await prisma.userTopicProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: { userId, topicId, questionCount, correctCount, masteryPercent, lastStudiedAt: new Date() },
    update: { questionCount, correctCount, masteryPercent, lastStudiedAt: new Date() }
  });
}
