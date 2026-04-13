import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import NavigationHeader from "../components/NavigationHeader";
import Quiz from "../components/Quiz";
import Mascot from "../components/Mascot";
import { Page, AppState, BackpackItem, UpdateStateFn } from "../App";
import { VocabularyItem } from "../data/vocabulary";
import { usePremium } from "../lib/usePremium";
import {
  fetchAIVocabulary,
  getFiveStageLevel,
  getVocabularyLevelCycle,
  prefetchAIVocabularyWindow,
  readCachedAIVocabulary,
  writeCachedAIVocabulary,
  VOCABULARY_PACK_WORD_COUNT,
} from "../lib/aiVocabulary";
import { BATTERY_MAX, spendBattery } from "../lib/battery";
import { pickNextQuizWord, QuizMasteryState, recordQuizOutcome } from "../lib/quizMastery";

interface VocabularyLearningProps {
  navigate: (page: Page) => void;
  openMobileNav?: () => void;
  appState: AppState;
  updateState: UpdateStateFn;
  premium: ReturnType<typeof usePremium>;
}

const normalizeComparableText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ");

const VOCAB_LEVEL_CHECKPOINTS = [
  {
    id: "warm-up-1",
    target: 6,
    title: "Warm Up 1 Complete!",
    message: "Great work. You cleared Warm Up 1 and unlocked Word Builder 2.",
    cta: "Start Word Builder 2",
    unlocksSentencePhase: false,
  },
  {
    id: "word-builder-2",
    target: 12,
    title: "Word Builder 2 Complete!",
    message: "Nice progress. You are ready for the next vocabulary challenge.",
    cta: "Continue to Level 3",
    unlocksSentencePhase: false,
  },
  {
    id: "phrase-builder-3",
    target: 18,
    title: "Level 3 Complete!",
    message: "Phase 2 is unlocked. You can jump into Sentence Practice now.",
    cta: "Keep Vocabulary Practice",
    unlocksSentencePhase: true,
  },
] as const;

const getQuizIntervalForBand = (band: "beginner" | "intermediate" | "advanced") => {
  if (band === "beginner") {
    return 3;
  }

  if (band === "intermediate") {
    return 4;
  }

  return 5;
};

const QUIZ_SESSION_STORAGE_KEY = "phonix-vocabulary-quiz-session-v1";
const CHECKPOINT_STORAGE_KEY = "phonix-vocabulary-shown-checkpoints-v1";

const buildCheckpointKey = (cycle: number, checkpointId: string) => `${cycle}:${checkpointId}`;

const readPersistedCheckpointKeys = () => {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  const raw = window.localStorage.getItem(CHECKPOINT_STORAGE_KEY);
  if (!raw) {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

const writePersistedCheckpointKeys = (keys: Set<string>) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify([...keys]));
};

interface PersistedQuizSessionState {
  levelCycle: number;
  isQuizMode: boolean;
  isReviewMode: boolean;
  isPracticeQuizSession: boolean;
  quizWordId: string | null;
  quizPoolIds: string[];
  reviewWordIds: string[];
  pendingQuizWordId: string | null;
  wordsBeforeQuiz: number;
  consecutiveWords: number;
  quizRound: number;
  quizMastery: QuizMasteryState;
  lastQuizWordId: string | null;
  activeCheckpointId: string | null;
}

const readPersistedQuizSessionState = (): PersistedQuizSessionState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedQuizSessionState;
  } catch {
    return null;
  }
};

export default function VocabularyLearning({
  navigate,
  openMobileNav,
  appState,
  updateState,
  premium,
}: VocabularyLearningProps) {
  const isGuestMode = (() => {
    if (typeof window === "undefined") {
      return false;
    }

    const rawUser = window.localStorage.getItem("user");
    if (!rawUser) {
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { name?: string; email?: string };
      const name = (user.name || "").trim().toLowerCase();
      const email = (user.email || "").trim();
      return name === "guest" || email.length === 0;
    } catch {
      return false;
    }
  })();
  const targetLanguage = appState.targetLanguage || "Hiligaynon";
  const nativeLanguage = appState.nativeLanguage || "English";
  const levelCycle = getVocabularyLevelCycle(appState.learnedWords.length);
  const learnedInCurrentCycle = appState.learnedWords.length % VOCABULARY_PACK_WORD_COUNT;

  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [quizWord, setQuizWord] = useState<VocabularyItem | null>(null);
  const [quizPoolSnapshot, setQuizPoolSnapshot] = useState<VocabularyItem[]>([]);
  const [reviewWords, setReviewWords] = useState<VocabularyItem[]>([]);
  const [pendingQuizWord, setPendingQuizWord] = useState<VocabularyItem | null>(null);
  const [wordsBeforeQuiz, setWordsBeforeQuiz] = useState(3);
  const [consecutiveWords, setConsecutiveWords] = useState(0);
  const [showOutOfBatteriesModal, setShowOutOfBatteriesModal] = useState(false);
  const [showLevelCompleteModal, setShowLevelCompleteModal] = useState(false);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [quizRound, setQuizRound] = useState(0);
  const [quizMastery, setQuizMastery] = useState<QuizMasteryState>({});
  const [lastQuizWordId, setLastQuizWordId] = useState<string | null>(null);
  const [quizSessionKey, setQuizSessionKey] = useState(0);
  const [isPracticeQuizSession, setIsPracticeQuizSession] = useState(false);
  const previousLevelCycleRef = useRef(levelCycle);
  const shownCheckpointIdsRef = useRef<Set<string>>(new Set());
  const pendingQuizSessionRef = useRef<PersistedQuizSessionState | null>(readPersistedQuizSessionState());
  const hasRestoredQuizSessionRef = useRef(false);
  const [aiVocabulary, setAiVocabulary] = useState<VocabularyItem[]>(() => {
    return readCachedAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
  });
  const [aiFlashcardItem, setAiFlashcardItem] = useState<VocabularyItem | null>(null);

  useEffect(() => {
    const shouldAllowRefresh = learnedInCurrentCycle === 0;
    const cached = readCachedAIVocabulary(targetLanguage, nativeLanguage, {
      levelCycle,
    });
    setAiVocabulary(cached);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    setAiFlashcardItem(null);
    prefetchAIVocabularyWindow(targetLanguage, nativeLanguage, levelCycle);

    let cancelled = false;

    const loadAIVocabulary = async () => {
      try {
        const words = await fetchAIVocabulary(targetLanguage, nativeLanguage, {
          levelCycle,
          allowRefresh: shouldAllowRefresh,
        });
        if (cancelled) {
          return;
        }

        setAiVocabulary(words);
        writeCachedAIVocabulary(targetLanguage, nativeLanguage, words, { levelCycle });
      } catch {
        // Keep using cached AI words when provider is unavailable.
      }
    };

    loadAIVocabulary();

    return () => {
      cancelled = true;
    };
  }, [targetLanguage, nativeLanguage, isGuestMode, levelCycle, learnedInCurrentCycle]);

  useEffect(() => {
    if (previousLevelCycleRef.current === levelCycle) {
      return;
    }

    previousLevelCycleRef.current = levelCycle;
    updateState({
      currentVocabIndex: 0,
      quizAnswersInCycle: 0,
      sentenceAnswersInCycle: 0,
    });
    setQuizRound(0);
    setQuizMastery({});
    setLastQuizWordId(null);
    setQuizSessionKey(0);
    setIsQuizMode(false);
    setQuizWord(null);
    setQuizPoolSnapshot([]);
    setIsPracticeQuizSession(false);
    setIsReviewMode(false);
    setReviewWords([]);
    setPendingQuizWord(null);
    setConsecutiveWords(0);
    shownCheckpointIdsRef.current = new Set();
    setActiveCheckpointId(null);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
    }
    pendingQuizSessionRef.current = null;
    hasRestoredQuizSessionRef.current = true;
  }, [levelCycle, updateState]);

  useEffect(() => {
    const persistedCheckpointKeys = readPersistedCheckpointKeys();
    const earnedCheckpointKeys = VOCAB_LEVEL_CHECKPOINTS.filter(
      (checkpoint) => checkpoint.target <= learnedInCurrentCycle,
    ).map((checkpoint) => buildCheckpointKey(levelCycle, checkpoint.id));

    const nextCheckpointKeys = new Set([
      ...persistedCheckpointKeys,
      ...earnedCheckpointKeys,
    ]);

    shownCheckpointIdsRef.current = nextCheckpointKeys;
    writePersistedCheckpointKeys(nextCheckpointKeys);
  }, [levelCycle, learnedInCurrentCycle]);

  useEffect(() => {
    if (hasRestoredQuizSessionRef.current) {
      return;
    }

    const persisted = pendingQuizSessionRef.current;
    if (!persisted) {
      hasRestoredQuizSessionRef.current = true;
      return;
    }

    if (persisted.levelCycle !== levelCycle) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
      }
      pendingQuizSessionRef.current = null;
      hasRestoredQuizSessionRef.current = true;
      return;
    }

    if (aiVocabulary.length === 0) {
      return;
    }

    const wordsById = new Map(aiVocabulary.map((item) => [item.id, item]));
    const restoredQuizWord = persisted.quizWordId ? wordsById.get(persisted.quizWordId) || null : null;
    const restoredPendingQuizWord = persisted.pendingQuizWordId
      ? wordsById.get(persisted.pendingQuizWordId) || null
      : null;
    const restoredQuizPool = persisted.quizPoolIds
      .map((id) => wordsById.get(id))
      .filter((item): item is VocabularyItem => !!item);
    const restoredReviewWords = persisted.reviewWordIds
      .map((id) => wordsById.get(id))
      .filter((item): item is VocabularyItem => !!item);

    setWordsBeforeQuiz(persisted.wordsBeforeQuiz);
    setConsecutiveWords(persisted.consecutiveWords);
    setQuizRound(persisted.quizRound);
    setQuizMastery(persisted.quizMastery || {});
    setLastQuizWordId(persisted.lastQuizWordId);
    setActiveCheckpointId(persisted.activeCheckpointId);
    setIsPracticeQuizSession(persisted.isPracticeQuizSession);

    if (persisted.isQuizMode && restoredQuizWord) {
      setQuizWord(restoredQuizWord);
      setQuizPoolSnapshot(
        restoredQuizPool.length > 0 ? restoredQuizPool : buildQuizPoolSnapshot(restoredQuizWord)
      );
      setIsQuizMode(true);
      setQuizSessionKey((previous) => previous + 1);
    }

    if (persisted.isReviewMode && restoredPendingQuizWord) {
      setPendingQuizWord(restoredPendingQuizWord);
      setReviewWords(restoredReviewWords);
      setIsReviewMode(true);
    }

    pendingQuizSessionRef.current = null;
    hasRestoredQuizSessionRef.current = true;
  }, [aiVocabulary]);

  const currentLevelWords = (() => {
    const difficulty =
      learnedInCurrentCycle < 20
        ? "beginner"
        : learnedInCurrentCycle < 40
          ? "intermediate"
          : "advanced";
    return aiVocabulary.filter((item) => item.difficulty === difficulty);
  })();
  const beginnerWords = aiVocabulary.filter((item) => item.difficulty === "beginner");
  const intermediateWords = aiVocabulary.filter((item) => item.difficulty === "intermediate");
  const advancedWords = aiVocabulary.filter((item) => item.difficulty === "advanced");

  const beginnerCount = beginnerWords.length || 20;
  const intermediateCount = intermediateWords.length || 20;
  const advancedCount = advancedWords.length || 7;

  const learnedCount = learnedInCurrentCycle;
  const currentDifficultyBand: "beginner" | "intermediate" | "advanced" =
    learnedCount < beginnerCount
      ? "beginner"
      : learnedCount < beginnerCount + intermediateCount
        ? "intermediate"
        : "advanced";

  useEffect(() => {
    setWordsBeforeQuiz(getQuizIntervalForBand(currentDifficultyBand));
  }, [currentDifficultyBand]);

  const bandProgress =
    currentDifficultyBand === "beginner"
      ? learnedCount
      : currentDifficultyBand === "intermediate"
        ? Math.max(0, learnedCount - beginnerCount)
        : Math.max(0, learnedCount - beginnerCount - intermediateCount);
  const bandTotal =
    currentDifficultyBand === "beginner"
      ? beginnerCount
      : currentDifficultyBand === "intermediate"
        ? intermediateCount
        : advancedCount;
  const levelStage = getFiveStageLevel(bandProgress, bandTotal);
  const totalVocabularyWords = beginnerCount + intermediateCount + advancedCount;

  const fallbackItem: VocabularyItem = {
    id: "ai-loading",
    nativeWord: "Loading",
    englishWord: "Loading",
    category: "general",
    emoji: "🧠",
    difficulty: "beginner",
  };

  const currentItem = aiVocabulary[appState.currentVocabIndex] || aiVocabulary[0] || fallbackItem;
  const hasAIVocabulary = aiVocabulary.length > 0;
  const displayedItem = aiFlashcardItem || currentItem;
  const currentItemLearned = appState.learnedWords.includes(currentItem.id);
  const nextIndex = appState.currentVocabIndex + 1;
  const nextItem = nextIndex < aiVocabulary.length ? aiVocabulary[nextIndex] : null;
  const nextItemLearned = nextItem ? appState.learnedWords.includes(nextItem.id) : false;
  const introducedVocabulary = aiVocabulary.slice(0, Math.max(appState.currentVocabIndex, 0) + 1);
  const introducedCurrentBandWords = introducedVocabulary.filter(
    (item) => item.difficulty === currentDifficultyBand,
  );
  const backpackDiscoveredVocabulary = aiVocabulary.filter((item) =>
    appState.backpackItems.some((backpackItem) => {
      if (backpackItem.id === `lesson:${item.id}`) {
        return true;
      }

      return (
        normalizeComparableText(backpackItem.nativeText) ===
          normalizeComparableText(item.nativeWord) &&
        normalizeComparableText(backpackItem.translatedText) ===
          normalizeComparableText(item.englishWord)
      );
    }),
  );
  const quizWordPool =
    introducedCurrentBandWords.length >= 4
      ? introducedCurrentBandWords
      : introducedVocabulary.length >= 4
        ? introducedVocabulary
        : currentLevelWords.slice(0, Math.min(currentLevelWords.length, 4));
  const activeCheckpoint =
    activeCheckpointId === null
      ? null
      : VOCAB_LEVEL_CHECKPOINTS.find((checkpoint) => checkpoint.id === activeCheckpointId) || null;

  useEffect(() => {
    if (!hasAIVocabulary) {
      return;
    }

    if (appState.currentVocabIndex < aiVocabulary.length) {
      return;
    }

    updateState({ currentVocabIndex: Math.max(0, aiVocabulary.length - 1) });
  }, [hasAIVocabulary, appState.currentVocabIndex, aiVocabulary.length, updateState]);

  useEffect(() => {
    const stripCodeFence = (text: string) =>
      text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    const parseAIFlashcardPayload = (rawText: string) => {
      const cleaned = stripCodeFence(rawText);

      try {
        return JSON.parse(cleaned) as {
          nativeWord?: string;
          englishWord?: string;
          category?: string;
          emoji?: string;
        };
      } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");

        if (start === -1 || end === -1 || end <= start) {
          return null;
        }

        try {
          return JSON.parse(cleaned.slice(start, end + 1)) as {
            nativeWord?: string;
            englishWord?: string;
            category?: string;
            emoji?: string;
          };
        } catch {
          return null;
        }
      }
    };

    setAiFlashcardItem(null);

    if (!hasAIVocabulary) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const buildAIFlashcard = async () => {
      try {
        const prompt = [
          "You are generating one language-learning flashcard item.",
          `Difficulty level: ${currentItem.difficulty}.`,
          `Target language: ${appState.targetLanguage || "Hiligaynon"}.`,
          `Learner native language: ${appState.nativeLanguage || "English"}.`,
          `Reference native word: ${currentItem.nativeWord}.`,
          `Reference English word: ${currentItem.englishWord}.`,
          `Reference category: ${currentItem.category}.`,
          "",
          "Return STRICT JSON only with this shape:",
          "{",
          '  "nativeWord": "string",',
          '  "englishWord": "string",',
          '  "category": "string",',
          '  "emoji": "string"',
          "}",
          "",
          "Rules:",
          "1. Keep nativeWord and englishWord concise and learner-friendly.",
          "2. Preserve the same meaning as the reference word pair.",
          "3. category should stay simple (one short word or phrase).",
        ].join("\n");

        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error("ai-flashcard-request-failed");
        }

        const data = await response.json();
        const payload = parseAIFlashcardPayload(String(data?.text || ""));

        const nativeWord = (payload?.nativeWord || "").trim();
        const englishWord = (payload?.englishWord || "").trim();

        if (!nativeWord || !englishWord) {
          throw new Error("ai-flashcard-invalid-payload");
        }

        const sameNativeMeaning =
          normalizeComparableText(nativeWord) === normalizeComparableText(currentItem.nativeWord);
        const sameEnglishMeaning =
          normalizeComparableText(englishWord) === normalizeComparableText(currentItem.englishWord);

        if (!sameNativeMeaning || !sameEnglishMeaning) {
          throw new Error("ai-flashcard-meaning-drift");
        }

        const nextFlashcard: VocabularyItem = {
          id: currentItem.id,
          nativeWord: currentItem.nativeWord,
          englishWord: currentItem.englishWord,
          category: (payload?.category || currentItem.category).trim() || currentItem.category,
          emoji: currentItem.emoji,
          difficulty: currentItem.difficulty,
        };

        if (!cancelled) {
          setAiFlashcardItem(nextFlashcard);
        }
      } catch {
        if (!cancelled) {
          setAiFlashcardItem(null);
        }
      }
    };

    buildAIFlashcard();

    return () => {
      cancelled = true;
    };
  }, [
    hasAIVocabulary,
    currentItem.id,
    currentItem.nativeWord,
    currentItem.englishWord,
    currentItem.category,
    currentItem.emoji,
    currentItem.difficulty,
    appState.targetLanguage,
    appState.nativeLanguage,
    isGuestMode,
  ]);

  const clearQuizState = () => {
    setIsQuizMode(false);
    setQuizWord(null);
    setQuizPoolSnapshot([]);
  };

  const clearReviewState = () => {
    setIsReviewMode(false);
    setReviewWords([]);
    setPendingQuizWord(null);
  };

  const exitPracticeQuizSession = () => {
    setIsPracticeQuizSession(false);
    clearQuizState();
    clearReviewState();
  };

  const buildQuizPoolSnapshot = (
    baseWord: VocabularyItem,
    sourcePoolOverride?: VocabularyItem[],
  ) => {
    const sourcePool =
      sourcePoolOverride && sourcePoolOverride.length > 0
        ? sourcePoolOverride
        : quizWordPool.length > 0
          ? quizWordPool
          : currentLevelWords;
    const deduped = sourcePool.filter(
      (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
    );

    if (deduped.some((item) => item.id === baseWord.id)) {
      return deduped;
    }

    return [baseWord, ...deduped];
  };

  const buildReviewSnapshot = (focusWord: VocabularyItem, sourceWords?: VocabularyItem[]) => {
    const reviewSource = sourceWords && sourceWords.length > 0 ? sourceWords : introducedVocabulary;
    const recentWords = reviewSource.slice(-Math.max(wordsBeforeQuiz, 3));
    const deduped = recentWords.filter(
      (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
    );

    if (deduped.some((item) => item.id === focusWord.id)) {
      return deduped;
    }

    return [...deduped, focusWord].slice(-Math.max(wordsBeforeQuiz, 3));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persistedState: PersistedQuizSessionState = {
      levelCycle,
      isQuizMode,
      isReviewMode,
      isPracticeQuizSession,
      quizWordId: quizWord?.id || null,
      quizPoolIds: quizPoolSnapshot.map((item) => item.id),
      reviewWordIds: reviewWords.map((item) => item.id),
      pendingQuizWordId: pendingQuizWord?.id || null,
      wordsBeforeQuiz,
      consecutiveWords,
      quizRound,
      quizMastery,
      lastQuizWordId,
      activeCheckpointId,
    };

    window.sessionStorage.setItem(QUIZ_SESSION_STORAGE_KEY, JSON.stringify(persistedState));
  }, [
    isQuizMode,
    isReviewMode,
    isPracticeQuizSession,
    quizWord,
    quizPoolSnapshot,
    reviewWords,
    pendingQuizWord,
    levelCycle,
    wordsBeforeQuiz,
    consecutiveWords,
    quizRound,
    quizMastery,
    lastQuizWordId,
    activeCheckpointId,
  ]);

  const startQuizSession = (word: VocabularyItem, sourcePoolOverride?: VocabularyItem[]) => {
    clearReviewState();
    setQuizWord(word);
    setQuizPoolSnapshot(buildQuizPoolSnapshot(word, sourcePoolOverride));
    setLastQuizWordId(word.id);
    setQuizSessionKey((previous) => previous + 1);
    setIsQuizMode(true);
  };

  const startReviewSession = (word: VocabularyItem, sourceWords?: VocabularyItem[]) => {
    clearQuizState();
    setPendingQuizWord(word);
    setReviewWords(buildReviewSnapshot(word, sourceWords));
    setIsReviewMode(true);
  };

  const startSmartReviewSession = (
    excludeWordIds: string[] = [],
    candidatePool: VocabularyItem[] = quizWordPool,
  ) => {
    const exclude = new Set(excludeWordIds);
    const availableWords = candidatePool.filter((item) => !exclude.has(item.id));

    if (availableWords.length === 0) {
      return false;
    }

    const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5);
    const selectedWord =
      shuffledWords.find((item) => item.id !== lastQuizWordId) || shuffledWords[0];

    if (!selectedWord) {
      return false;
    }

    startReviewSession(selectedWord, candidatePool);
    return true;
  };

  const startSmartPracticeQuizSession = (
    candidatePool: VocabularyItem[],
    excludeWordIds: string[] = [],
  ) => {
    const selectedWord = pickNextQuizWord({
      candidates: candidatePool,
      state: quizMastery,
      round: quizRound,
      excludeWordIds,
      lastQuizWordId,
    });

    if (!selectedWord) {
      return false;
    }

    startQuizSession(selectedWord, candidatePool);
    return true;
  };

  const moveToNextWordOrComplete = () => {
    if (appState.currentVocabIndex < aiVocabulary.length - 1) {
      updateState({
        currentVocabIndex: appState.currentVocabIndex + 1,
      });
    } else {
      setShowLevelCompleteModal(true);
    }
  };

  const advanceToNextWord = () => {
    if (!hasAIVocabulary) {
      return;
    }

    const isNewDiscovery = !appState.learnedWords.includes(currentItem.id);
    const tryingToAdvanceIntoNewContent =
      !premium.isPremium &&
      appState.batteriesRemaining === 0 &&
      (!currentItemLearned || (!!nextItem && !nextItemLearned));

    if (tryingToAdvanceIntoNewContent) {
      setShowOutOfBatteriesModal(true);
      return;
    }

    let nextConsecutiveWords = consecutiveWords;

    // Add to learned words if not already learned
    if (isNewDiscovery) {
      const lessonBackpackId = `lesson:${currentItem.id}`;
      const lessonBackpackItem: BackpackItem = {
        id: lessonBackpackId,
        nativeText: currentItem.nativeWord,
        translatedText: currentItem.englishWord,
        source: "lesson",
        createdAt: new Date().toISOString(),
        difficulty: currentItem.difficulty,
        emoji: currentItem.emoji,
      };
      updateState((prev) => {
        const hasLessonItem = prev.backpackItems.some((item) => item.id === lessonBackpackId);
        const hasLearnedWord = prev.learnedWords.includes(currentItem.id);
        return {
          learnedWords: hasLearnedWord ? prev.learnedWords : [...prev.learnedWords, currentItem.id],
          totalXP: prev.totalXP + 10,
          backpackItems: hasLessonItem
            ? prev.backpackItems
            : [lessonBackpackItem, ...prev.backpackItems],
        };
      });
      nextConsecutiveWords = consecutiveWords + 1;
      setConsecutiveWords(nextConsecutiveWords);

      const nextLearnedCount = Math.min(VOCABULARY_PACK_WORD_COUNT, learnedInCurrentCycle + 1);
      const reachedCheckpoint = VOCAB_LEVEL_CHECKPOINTS.find(
        (checkpoint) => checkpoint.target === nextLearnedCount,
      );
      const checkpointKey = reachedCheckpoint
        ? buildCheckpointKey(levelCycle, reachedCheckpoint.id)
        : null;
      if (reachedCheckpoint && checkpointKey && !shownCheckpointIdsRef.current.has(checkpointKey)) {
        shownCheckpointIdsRef.current.add(checkpointKey);
        writePersistedCheckpointKeys(shownCheckpointIdsRef.current);
        setActiveCheckpointId(reachedCheckpoint.id);
      }
    } else {
      updateState((prev) => ({
        totalXP: prev.totalXP + 2,
      }));
      setConsecutiveWords(0);
      nextConsecutiveWords = 0;
    }

    const shouldStartQuiz = isNewDiscovery && nextConsecutiveWords >= wordsBeforeQuiz;
    if (shouldStartQuiz) {
      const started = startSmartReviewSession([currentItem.id, nextItem?.id || ""]);
      if (started) {
        return;
      }
    }

    moveToNextWordOrComplete();
  };

  const handleNext = () => {
    advanceToNextWord();
  };

  const handleQuizAnswer = (correct: boolean) => {
    const answeredWord = quizWord || displayedItem;

    // Award stars for correct answers
    if (correct) {
      updateState((prev) => ({
        stars: prev.stars + 1,
      }));
    } else if (!premium.isPremium) {
      const nextBatteryState = spendBattery(
        {
          batteriesRemaining: appState.batteriesRemaining,
          batteryResetAt: appState.batteryResetAt,
        },
        1,
      );
      updateState((prev) => ({
        ...prev,
        batteriesRemaining: nextBatteryState.batteriesRemaining,
        batteryResetAt: nextBatteryState.batteryResetAt,
      }));

      if (nextBatteryState.batteriesRemaining === 0) {
        if (isPracticeQuizSession) {
          setQuizMastery((previous) =>
            recordQuizOutcome(previous, answeredWord.id, correct, quizRound),
          );
          setQuizRound((previous) => previous + 1);
        }
        setIsQuizMode(false);
        setConsecutiveWords(0);
        setShowOutOfBatteriesModal(true);
        return;
      }
    } else {
      // Premium users keep learning without losing batteries.
    }

    // Reset quiz mode and counter
    if (isPracticeQuizSession) {
      setQuizMastery((previous) =>
        recordQuizOutcome(previous, answeredWord.id, correct, quizRound),
      );
      setQuizRound((previous) => previous + 1);
    }
    clearQuizState();
    setConsecutiveWords(0);
    setWordsBeforeQuiz(getQuizIntervalForBand(currentDifficultyBand));

    if (isPracticeQuizSession) {
      const practicePool =
        backpackDiscoveredVocabulary.length >= 2
          ? backpackDiscoveredVocabulary
          : backpackDiscoveredVocabulary.length === 1
            ? backpackDiscoveredVocabulary
            : introducedVocabulary.length >= 2
              ? introducedVocabulary
              : introducedVocabulary.length === 1
                ? introducedVocabulary
                : [currentItem];

      const restarted = startSmartPracticeQuizSession(practicePool, [answeredWord.id]);
      if (!restarted) {
        setIsPracticeQuizSession(false);
      }
      return;
    }

    // Move to next word after quiz
    moveToNextWordOrComplete();
  };

  const handlePrevious = () => {
    setConsecutiveWords(0);
    exitPracticeQuizSession();

    if (appState.currentVocabIndex > 0) {
      updateState({
        currentVocabIndex: appState.currentVocabIndex - 1,
      });
    }
  };

  const playAudio = (text: string, lang: string, e?: React.MouseEvent<HTMLElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure language voice based on the clicked word
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 0.75;
      utterance.volume = 1.0;

      const speakWithBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const robotVoice = voices.find((voice) => {
          const name = voice.name.toLowerCase();
          return (
            name.includes("robot") ||
            name.includes("siri") ||
            name.includes("fred") ||
            name.includes("david") ||
            name.includes("zira") ||
            name.includes("microsoft") ||
            name.includes("google us english")
          );
        });

        const preferredVoice = voices.find((voice) => {
          const lang = voice.lang.toLowerCase();
          const target = lang.startsWith("fil") || lang.startsWith("tl") || lang.includes("ph");
          const english = lang.startsWith("en");
          return utterance.lang.startsWith("en") ? english : target;
        });

        const englishFallback = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
        utterance.voice = robotVoice || preferredVoice || englishFallback || voices[0] || null;
        window.speechSynthesis.speak(utterance);
      };

      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          speakWithBestVoice();
        };
      } else {
        speakWithBestVoice();
      }

      // Add event listeners for debugging
      utterance.onstart = () => console.log("Speech started");
      utterance.onend = () => console.log("Speech ended");
      utterance.onerror = (e) => console.error("Speech error:", e);
    } else {
      console.error("Speech synthesis not supported");
      alert("Audio playback not supported in this browser. Try Chrome or Safari.");
    }
  };

  const mascotMessage = (() => {
    if (isQuizMode) {
      return nativeLanguage.trim().toLowerCase() === "filipino"
        ? "Pwede akong magbigay ng clue, hindi sagot."
        : "I can give a clue, not the answer.";
    }

    if (isReviewMode) {
      return nativeLanguage.trim().toLowerCase() === "filipino"
        ? "Handa ka na ba? I-review muna natin ito."
        : "Ready? Let’s review these first.";
    }

    return nativeLanguage.trim().toLowerCase() === "filipino"
      ? "Magtanong ka tungkol sa word o clue."
      : "Ask me about the word or clues.";
  })();

  const vocabularyPageContext = [
    `Current page: vocabulary lesson.`,
    `Target language: ${targetLanguage}.`,
    `Response language: ${nativeLanguage}.`,
    `Current flashcard word: ${displayedItem.nativeWord} = ${displayedItem.englishWord}.`,
    `Current category: ${displayedItem.category}.`,
    `Current difficulty band: ${currentDifficultyBand}.`,
    `Current batteries: ${appState.batteriesRemaining}/${BATTERY_MAX}.`,
    premium.isPremium
      ? "Learner has premium and unlimited batteries."
      : "Learner is free tier. Mistakes can reduce batteries and premium unlocks unlimited batteries.",
    isQuizMode
      ? `Learner is in quiz mode right now. Quiz word is ${quizWord?.nativeWord || displayedItem.nativeWord} = ${
          quizWord?.englishWord || displayedItem.englishWord
        }. Never reveal the exact answer. Give only clues, hints, elimination help, pronunciation help, or category guidance.`
      : "Learner is not in quiz mode. You may teach normally and explain the current word clearly.",
    isReviewMode
      ? `Learner is reviewing these words before quiz: ${reviewWords
          .map((word) => `${word.nativeWord}=${word.englishWord}`)
          .join(", ")}.`
      : "",
    isPracticeQuizSession
      ? `Quiz Me mode is active. This is a mastery-based review session over backpack-discovered words. Current discovered pool size: ${backpackDiscoveredVocabulary.length}.`
      : "Normal lesson flow is active.",
    "If asked about batteries, explain that mistakes can drain batteries and premium gives unlimited batteries.",
    "If asked directly for a quiz answer, refuse and give a clue instead.",
    "If asked how the lesson works, explain flashcards first, then review, then quiz.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    // Vocabulary Learning Page Container
    <div className="flex min-h-[100dvh] flex-col overflow-hidden md:min-h-screen">
      {/* Top Navigation with Progress + Battery */}
      <NavigationHeader
        onMenu={openMobileNav}
        onBack={() => navigate("dashboard")}
        onLogout={() => navigate("landing")}
        title="Vocabulary Learning"
        showProgress={true}
        currentProgress={Math.max(0, Math.min(learnedInCurrentCycle, totalVocabularyWords))}
        totalProgress={Math.max(totalVocabularyWords, 1)}
        batteryCurrent={appState.batteriesRemaining}
        batteryMax={BATTERY_MAX}
        batteryResetAt={appState.batteryResetAt}
        isPremium={premium.isPremium}
      />

      {/* Main Lesson Content */}
      <div
        className={`flex flex-1 overflow-hidden px-3 pb-3 pt-2 sm:p-4 ${
          isQuizMode ? "items-start justify-center" : "items-center justify-center"
        }`}
      >
        <div
          className={`flex h-full w-full max-w-lg flex-col ${
            isQuizMode ? "justify-start" : "justify-center"
          }`}
        >
          {/* Entrance Spacer Animation */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 sm:mb-6"
          />

          {/* Page States: Loading, Review, Quiz, Flashcard */}
          {!hasAIVocabulary ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="theme-bg-surface rounded-3xl border p-8 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#FF9126] bg-[#1d3443] text-2xl">
                ⚡
              </div>
              <h2 className="mt-4 font-baloo text-3xl font-bold">Preparing AI lesson</h2>
              <p className="theme-text-soft mt-2 text-sm font-semibold">
                The AI vocabulary set is loading now. This starts as soon as the request is ready.
              </p>
            </motion.div>
          ) : isReviewMode ? (
            // Review Mode Card
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="theme-bg-surface rounded-3xl border p-8 shadow-2xl"
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ff9126] px-5 py-2 text-sm font-bold uppercase tracking-[0.08em] text-[#4a2a00]">
                  Review First
                </div>
                <h2 className="mt-4 font-baloo text-4xl font-bold">Remember These Words</h2>
                <p className="theme-text-soft mt-2 text-sm font-semibold">
                  Quick recap before the next quiz challenge.
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                {reviewWords.map((word) => (
                  <div
                    key={word.id}
                    className={`theme-bg-surface flex items-center justify-between rounded-2xl border px-5 py-4 ${
                      pendingQuizWord?.id === word.id ? "ring-2 ring-[#56b8e8]/35" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-5xl leading-none">{word.emoji}</div>
                      <div>
                        <p className="font-baloo text-3xl font-bold">{word.nativeWord}</p>
                        <p className="theme-text-soft text-sm font-semibold">{word.englishWord}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => playAudio(word.nativeWord, "fil-PH", e)}
                      className="theme-bg-surface flex h-11 w-11 items-center justify-center rounded-full border text-xl shadow-sm transition hover:border-[#FF9126]"
                      title={`Play ${word.nativeWord}`}
                      aria-label={`Play ${word.nativeWord}`}
                    >
                      🔊
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    if (isPracticeQuizSession) {
                      exitPracticeQuizSession();
                      return;
                    }

                    clearReviewState();
                  }}
                  className="theme-bg-surface rounded-2xl border px-6 py-4 text-sm font-bold uppercase tracking-[0.08em]"
                >
                  {isPracticeQuizSession ? "Exit Quiz Me" : "Back to Cards"}
                </button>
                <button
                  onClick={() => {
                    if (pendingQuizWord) {
                      startQuizSession(
                        pendingQuizWord,
                        isPracticeQuizSession && introducedVocabulary.length > 0
                          ? introducedVocabulary
                          : undefined,
                      );
                    }
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#FF9126] to-[#ffb35a] px-6 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-lg"
                >
                  Start Quiz
                </button>
              </div>
            </motion.div>
          ) : isQuizMode ? (
            // Quiz Mode
            <div className="flex h-full min-h-0 flex-col justify-start">
              {/* Practice Session Exit Action */}
              {isPracticeQuizSession && (
                <div className="mb-2 flex justify-end sm:mb-4">
                  <button
                    onClick={exitPracticeQuizSession}
                    className="theme-bg-surface rounded-2xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.08em]"
                  >
                    Exit Quiz
                  </button>
                </div>
              )}
              <Quiz
                key={quizSessionKey}
                currentWord={quizWord || displayedItem}
                allWords={quizPoolSnapshot.length > 0 ? quizPoolSnapshot : quizWordPool}
                onAnswer={handleQuizAnswer}
                targetLanguage={appState.targetLanguage || "Hiligaynon"}
                nativeLanguage={appState.nativeLanguage || "English"}
                useAI={true}
                difficultyBand={currentDifficultyBand}
                levelStage={levelStage}
              />
            </div>
          ) : (
            // Regular Flashcard Mode
            <>
              <motion.div
                key={displayedItem.id}
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                {/* Premium Glassmorphism Card */}
                <div className="relative group">
                  {/* Glow effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FF9126] via-[#ffb35a] to-[#56b8e8] opacity-50 blur-2xl"
                  />

                  <div className="theme-bg-surface relative rounded-3xl border p-5 shadow-2xl sm:p-8">
                    {/* Emoji Illustration with particle effect */}
                    <div className="relative mb-5 flex items-center justify-center sm:mb-8">
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="flex items-center justify-center text-[112px] leading-none sm:text-[150px]"
                      >
                        {displayedItem.emoji}
                      </motion.div>

                      {/* Floating particles */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            y: [-20, -60, -20],
                            x: [0, (i - 1) * 20, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.8,
                          }}
                          className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center justify-center text-xl sm:text-2xl"
                        >
                          ✨
                        </motion.div>
                      ))}
                    </div>

                    {/* Native Word Section */}
                    <div className="mb-5 sm:mb-8">
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="theme-text-soft mb-2 text-[11px] font-bold uppercase tracking-wider sm:mb-3 sm:text-sm"
                      >
                        {appState.targetLanguage}
                      </motion.p>
                      <div className="flex items-center justify-center gap-3 sm:gap-4">
                        <motion.h2
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="select-none bg-gradient-to-r from-[#FF9126] to-[#FF9126] bg-clip-text font-baloo text-5xl font-bold text-transparent sm:text-6xl"
                        >
                          {displayedItem.nativeWord}
                        </motion.h2>
                        <button
                          type="button"
                          onClick={(e) => playAudio(displayedItem.nativeWord, "fil-PH", e)}
                          className="theme-bg-surface flex h-11 w-11 items-center justify-center rounded-full border text-lg shadow-md transition hover:border-[#FF9126] hover:shadow-lg sm:h-12 sm:w-12 sm:text-xl"
                          title={`Play ${appState.targetLanguage} pronunciation`}
                          aria-label={`Play ${appState.targetLanguage} pronunciation`}
                        >
                          🔊
                        </button>
                      </div>
                    </div>

                    {/* English Translation Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="relative"
                    >
                      <div className="theme-bg-surface rounded-2xl border p-4 shadow-inner sm:p-6">
                        <p className="theme-text-soft mb-1 text-[11px] font-bold uppercase tracking-wider sm:mb-2 sm:text-xs">
                          {appState.nativeLanguage}
                        </p>
                        <div className="flex items-center justify-between gap-3 sm:gap-4">
                          <h3 className="select-none font-baloo text-4xl font-bold sm:text-5xl">
                            {displayedItem.englishWord}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => playAudio(displayedItem.englishWord, "en-US", e)}
                            className="theme-bg-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg shadow-md transition hover:border-[#56b8e8] hover:shadow-lg sm:h-12 sm:w-12 sm:text-xl"
                            title={`Play ${appState.nativeLanguage} pronunciation`}
                            aria-label={`Play ${appState.nativeLanguage} pronunciation`}
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* Category Badge */}
                    <div className="mt-4 flex justify-center sm:mt-6">
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="inline-flex items-center gap-2 rounded-full border border-[#FF9126] bg-gradient-to-r from-[#FF9126] to-[#ffb35a] px-3 py-1.5 sm:px-4 sm:py-2"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#4a2a00] sm:text-xs">
                          {displayedItem.category}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Premium Navigation Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-4 sm:mt-8"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="sm:col-span-1"
                  >
                    <button
                      onClick={handlePrevious}
                      disabled={appState.currentVocabIndex === 0}
                      className={`w-full rounded-2xl px-5 py-3.5 font-bold transition-all sm:px-6 sm:py-4 sm:text-lg ${
                        appState.currentVocabIndex === 0
                          ? "theme-bg-surface cursor-not-allowed"
                          : "theme-bg-surface border text-sm hover:border-[#FF9126] hover:shadow-lg"
                      }`}
                    >
                      ← Previous
                    </button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="sm:col-span-1"
                  >
                    <button
                      onClick={() => {
                        const practicePool =
                          backpackDiscoveredVocabulary.length >= 2
                            ? backpackDiscoveredVocabulary
                            : backpackDiscoveredVocabulary.length === 1
                              ? backpackDiscoveredVocabulary
                              : introducedVocabulary.length >= 2
                                ? introducedVocabulary
                                : introducedVocabulary.length === 1
                                  ? introducedVocabulary
                                  : [currentItem];
                        setIsPracticeQuizSession(true);
                        const started = startSmartPracticeQuizSession(practicePool);
                        if (!started) {
                          startQuizSession(currentItem, practicePool);
                        }
                      }}
                      className="w-full rounded-2xl border border-[#56b8e8] bg-[#173b52] px-5 py-3.5 text-sm font-bold uppercase tracking-[0.08em] text-[#c9efff] transition hover:border-[#7ed6ff] sm:px-6 sm:py-4"
                    >
                      Quiz Me
                    </button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="sm:col-span-1"
                  >
                    <button
                      onClick={handleNext}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF9126] to-[#ffb35a] px-5 py-3.5 font-bold shadow-lg transition-all hover:shadow-2xl sm:px-6 sm:py-4 sm:text-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FF9126] to-[#FF9126] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 text-white transition-colors group-hover:text-[#fff3de]">
                        Next →
                      </span>
                    </button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Premium Progress Indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-4 flex justify-center gap-2 sm:mt-6"
              >
                {aiVocabulary.slice(0, Math.min(10, aiVocabulary.length)).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === appState.currentVocabIndex
                        ? "w-8 bg-gradient-to-r from-[#FF9126] to-[#ffb35a] shadow-lg"
                        : appState.learnedWords.includes(item.id)
                          ? "w-2 bg-gradient-to-r from-[#FAC775] to-[#ffb35a]"
                          : "bg-gray-300 w-2"
                    }`}
                  />
                ))}
                {aiVocabulary.length > 10 && (
                  <div className="theme-text-soft ml-2 self-center text-xs">
                    +{aiVocabulary.length - 10} more
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Out-of-Batteries Modal */}
      {showOutOfBatteriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🪫</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">Out of Batteries!</h3>
            <p className="mt-3 text-gray-600 font-semibold">
              Every mistake costs 1 battery. Upgrade to premium for unlimited batteries, or come
              back later and keep practicing.
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-500">
              Batteries refill automatically after 3 hours.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("premium")}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg"
              >
                Get Unlimited Batteries
              </button>
              <button
                onClick={() => {
                  setShowOutOfBatteriesModal(false);
                  navigate("dashboard");
                }}
                className="flex-1 rounded-2xl bg-gray-100 px-6 py-4 font-bold"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Complete Modal */}
      {showLevelCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🎉</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">Level Complete!</h3>
            <p className="mt-3 text-gray-600 font-semibold">
              Nice work. You finished all the flashcards. You can review the words you learned in
              your Backpack, or proceed to sentence learning.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowLevelCompleteModal(false);
                  navigate("collection");
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg"
              >
                See Backpack
              </button>
              <button
                onClick={() => {
                  setShowLevelCompleteModal(false);
                  navigate("sentence");
                }}
                className="flex-1 rounded-2xl border border-primary bg-white px-6 py-4 font-bold text-gray-700"
              >
                Proceed to Sentence Learning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Checkpoint Modal */}
      {activeCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🏁</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">
              {activeCheckpoint.unlocksSentencePhase ? "Level Complete!" : activeCheckpoint.title}
            </h3>
            <p className="mt-3 text-gray-600 font-semibold">
              {activeCheckpoint.unlocksSentencePhase
                ? "Nice work. You finished this level pack. You can review the words you learned in your Backpack, continue learning vocabulary, or proceed to sentence learning."
                : activeCheckpoint.message}
            </p>
            <div
              className={`mt-6 flex flex-col gap-3 ${
                activeCheckpoint.unlocksSentencePhase ? "" : "sm:flex-row"
              }`}
            >
              {activeCheckpoint.unlocksSentencePhase && (
                <button
                  onClick={() => {
                    setActiveCheckpointId(null);
                    navigate("collection");
                  }}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg"
                >
                  See Backpack
                </button>
              )}
              <button
                onClick={() => setActiveCheckpointId(null)}
                className={`flex-1 rounded-2xl px-6 py-4 font-bold ${
                  activeCheckpoint.unlocksSentencePhase
                    ? "bg-gray-100 text-gray-700"
                    : "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                }`}
              >
                {activeCheckpoint.unlocksSentencePhase ? "Continue Learning" : activeCheckpoint.cta}
              </button>
              {activeCheckpoint.unlocksSentencePhase && (
                <button
                  onClick={() => {
                    setActiveCheckpointId(null);
                    navigate("sentence");
                  }}
                  className="flex-1 rounded-2xl border border-primary bg-white px-6 py-4 font-bold text-gray-700"
                >
                  Proceed to Sentence Learning
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Mascot Assistant */}
      <Mascot
        message={mascotMessage}
        animation="float"
        responseLanguage={nativeLanguage}
        pageContext={vocabularyPageContext}
      />
    </div>
  );
}
