export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export type ReviewState = {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
};

export function nextReview(state: ReviewState, rating: Rating) {
  let { intervalDays, easeFactor, repetitions } = state;

  if (rating === 'AGAIN') {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 'HARD') {
    repetitions += 1;
    intervalDays = Math.max(1, Math.round((intervalDays || 1) * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 'GOOD') {
    repetitions += 1;
    intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round((intervalDays || 1) * easeFactor);
  } else if (rating === 'EASY') {
    repetitions += 1;
    intervalDays = repetitions === 1 ? 3 : Math.round((intervalDays || 1) * (easeFactor + 0.25));
    easeFactor += 0.1;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return {
    intervalDays,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    dueDate
  };
}
