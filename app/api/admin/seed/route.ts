export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { seedTopics } from '@/data/seed';
import { hashPassword } from '@/lib/password';

export async function POST() {
  await prisma.session.deleteMany();
  await prisma.flashcardReview.deleteMany();
  await prisma.userFlashcardState.deleteMany();
  await prisma.questionAttempt.deleteMany();
  await prisma.userTopicProgress.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.flashcard.deleteMany();
  await prisma.caseStudy.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.user.deleteMany();

  for (const topic of seedTopics) {
    const createdTopic = await prisma.topic.create({
      data: {
        slug: topic.slug,
        title: topic.title,
        system: topic.system,
        summary: topic.summary,
        difficulty: topic.difficulty,
        estMinutes: topic.estMinutes,
        highYield: topic.highYield,
        lessons: { create: topic.lesson },
        flashcards: { create: topic.flashcards },
        cases: { create: topic.cases },
        questions: { create: topic.questions.map((question) => ({ stem: question.stem, explanation: question.explanation, difficulty: question.difficulty, options: { create: question.options.map((opt: (string | boolean)[]) => ({ label: opt[0] as string, text: opt[1] as string, isCorrect: opt[2] as boolean })) } })) }
      }, include: { questions: { include: { options: true } } }
    });

    for (const question of createdTopic.questions) {
      const correct = question.options.find((option) => option.isCorrect);
      if (correct) await prisma.question.update({ where: { id: question.id }, data: { correctOptionId: correct.id } });
    }
  }

  await prisma.user.create({ data: { name: 'Admin Demo', email: 'admin@medrev.local', passwordHash: hashPassword('Admin12345!'), role: 'ADMIN' } });
  await prisma.user.create({ data: { name: 'Student Demo', email: 'student@medrev.local', passwordHash: hashPassword('Student12345!'), role: 'STUDENT' } });

  return NextResponse.json({ message: 'Demo content and V2 demo users reseeded successfully.' });
}