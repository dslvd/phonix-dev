import { VocabularyItem } from '../data/vocabulary';

export interface QuizMasteryEntry {
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  correctStreak: number;
  lastRound: number;
  dueRound: number;
  mastered: boolean;
}

export type QuizMasteryState = Record<string, QuizMasteryEntry>;

const MASTERED_STREAK = 2;
const REVIEW_AGAIN_SOON = 1;
const REVIEW_LATER = 3;
const REVIEW_WELL_LEARNED = 5;

const createEntry = (): QuizMasteryEntry => ({
  attempts: 0,
  correctAttempts: 0,
  incorrectAttempts: 0,
  correctStreak: 0,
  lastRound: -1,
  dueRound: 0,
  mastered: false,
});

export const getQuizMasteryEntry = (
  state: QuizMasteryState,
  wordId: string
): QuizMasteryEntry => state[wordId] || createEntry();

export const recordQuizOutcome = (
  state: QuizMasteryState,
  wordId: string,
  correct: boolean,
  round: number
): QuizMasteryState => {
  const previous = getQuizMasteryEntry(state, wordId);
  const next: QuizMasteryEntry = {
    ...previous,
    attempts: previous.attempts + 1,
    correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
    incorrectAttempts: previous.incorrectAttempts + (correct ? 0 : 1),
    correctStreak: correct ? previous.correctStreak + 1 : 0,
    lastRound: round,
    dueRound: correct ? round + (previous.correctStreak >= 1 ? REVIEW_WELL_LEARNED : REVIEW_LATER) : round + REVIEW_AGAIN_SOON,
    mastered: false,
  };

  next.mastered =
    next.incorrectAttempts === 0
      ? next.correctStreak >= 1
      : next.correctStreak >= MASTERED_STREAK;

  if (next.mastered) {
    next.dueRound = Number.POSITIVE_INFINITY;
  }

  return {
    ...state,
    [wordId]: next,
  };
};

interface PickNextQuizWordArgs {
  candidates: VocabularyItem[];
  state: QuizMasteryState;
  round: number;
  excludeWordIds?: string[];
  lastQuizWordId?: string | null;
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export const pickNextQuizWord = ({
  candidates,
  state,
  round,
  excludeWordIds = [],
  lastQuizWordId = null,
}: PickNextQuizWordArgs): VocabularyItem | null => {
  const exclude = new Set(excludeWordIds);
  const available = candidates.filter((item) => !exclude.has(item.id));
  if (available.length === 0) {
    return null;
  }

  const notMastered = available.filter((item) => !getQuizMasteryEntry(state, item.id).mastered);
  const pool = notMastered.length > 0 ? notMastered : available;

  const due = pool.filter((item) => getQuizMasteryEntry(state, item.id).dueRound <= round);
  const unseen = pool.filter((item) => getQuizMasteryEntry(state, item.id).attempts === 0);

  const preferredPool =
    due.length > 0
      ? due
      : unseen.length > 0
      ? unseen
      : pool;

  const sorted = shuffle(preferredPool).sort((left, right) => {
    const leftEntry = getQuizMasteryEntry(state, left.id);
    const rightEntry = getQuizMasteryEntry(state, right.id);

    const leftPriority =
      leftEntry.incorrectAttempts * 100 -
      leftEntry.correctStreak * 10 -
      leftEntry.lastRound;
    const rightPriority =
      rightEntry.incorrectAttempts * 100 -
      rightEntry.correctStreak * 10 -
      rightEntry.lastRound;

    return rightPriority - leftPriority;
  });

  if (sorted.length > 1 && lastQuizWordId) {
    const nonRepeating = sorted.find((item) => item.id !== lastQuizWordId);
    if (nonRepeating) {
      return nonRepeating;
    }
  }

  return sorted[0] || null;
};
