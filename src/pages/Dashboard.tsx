import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Page, AppState, UpdateStateFn } from '../App';
import { VocabularyItem, sentenceData, vocabularyData } from '../data/vocabulary';
import { usePremium } from '../lib/usePremium';
import {
  fetchAIVocabulary,
  getVocabularyLevelCycle,
  readCachedAIVocabulary,
  writeCachedAIVocabulary,
  VOCABULARY_PACK_WORD_COUNT,
} from '../lib/aiVocabulary';
import { BATTERY_MAX, formatBatteryCountdown } from '../lib/battery';

interface DashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: UpdateStateFn;
  premium: ReturnType<typeof usePremium>;
}

export default function Dashboard({ navigate, appState, updateState, premium }: DashboardProps) {
  const levelCycle = getVocabularyLevelCycle(appState.learnedWords.length);
  const learnedInCurrentCycle = appState.learnedWords.length % VOCABULARY_PACK_WORD_COUNT;
  const isGuestMode = (() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const rawUser = window.localStorage.getItem('user');
    if (!rawUser) {
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { name?: string; email?: string };
      const name = (user.name || '').trim().toLowerCase();
      const email = (user.email || '').trim();
      return name === 'guest' || email.length === 0;
    } catch {
      return false;
    }
  })();

  const hasLoggedInUser = typeof window !== 'undefined' && !!window.localStorage.getItem('user');
  const showRightRail = !isGuestMode || !hasLoggedInUser;
  const [aiVocabulary, setAiVocabulary] = useState<VocabularyItem[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    Array<{ rank: number; userKey: string; displayName: string; totalXP: number; stars: number; learnedWords: number; currentStreak: number }>
  >([]);

  const defaultLevelDescriptions: Record<'Beginner' | 'Intermediate' | 'Advanced', string> = {
    Beginner: 'Core everyday words and pronunciation foundations.',
    Intermediate: 'Useful phrase-building words for daily conversations.',
    Advanced: 'Nuanced vocabulary to speak with confidence and depth.',
  };
  const [levelDescriptions, setLevelDescriptions] = useState(defaultLevelDescriptions);

  useEffect(() => {
    const targetLanguage = appState.targetLanguage || 'Hiligaynon';
    const nativeLanguage = appState.nativeLanguage || 'English';
    const shouldAllowRefresh = learnedInCurrentCycle === 0;

    if (isGuestMode) {
      setAiVocabulary(vocabularyData.slice(0, VOCABULARY_PACK_WORD_COUNT));
      return;
    }

    const cached = readCachedAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
    if (cached.length > 0) {
      setAiVocabulary(cached);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const refreshAIVocabulary = async () => {
      try {
        const words = await fetchAIVocabulary(targetLanguage, nativeLanguage, { levelCycle, allowRefresh: shouldAllowRefresh });
        if (cancelled) {
          return;
        }
        setAiVocabulary(words);
        writeCachedAIVocabulary(targetLanguage, nativeLanguage, words, { levelCycle });
      } catch {
        // Keep cached AI vocabulary when provider is unavailable.
      }
    };

    refreshAIVocabulary();

    return () => {
      cancelled = true;
    };
  }, [appState.targetLanguage, appState.nativeLanguage, isGuestMode, levelCycle, learnedInCurrentCycle]);

  useEffect(() => {
    setLevelDescriptions(defaultLevelDescriptions);

    if (isGuestMode) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const stripCodeFence = (text: string) =>
      text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const parsePayload = (rawText: string) => {
      const cleaned = stripCodeFence(rawText);
      try {
        return JSON.parse(cleaned) as Partial<Record<'Beginner' | 'Intermediate' | 'Advanced', string>>;
      } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');

        if (start === -1 || end === -1 || end <= start) {
          return null;
        }

        try {
          return JSON.parse(cleaned.slice(start, end + 1)) as Partial<Record<'Beginner' | 'Intermediate' | 'Advanced', string>>;
        } catch {
          return null;
        }
      }
    };

    const loadAILessonDescriptions = async () => {
      try {
        const prompt = [
          'Create short learning-path descriptions for language learners.',
          `Target language: ${appState.targetLanguage || 'Hiligaynon'}.`,
          `Learner native language: ${appState.nativeLanguage || 'English'}.`,
          'Return STRICT JSON only with this exact shape:',
          '{',
          '  "Beginner": "string",',
          '  "Intermediate": "string",',
          '  "Advanced": "string"',
          '}',
          'Rules:',
          '1. One sentence each.',
          '2. Max 10 words each sentence.',
          '3. Keep practical and motivating.',
        ].join('\n');

        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('ai-learn-page-request-failed');
        }

        const data = await response.json();
        const payload = parsePayload(String(data?.text || ''));

        const beginner = (payload?.Beginner || '').trim();
        const intermediate = (payload?.Intermediate || '').trim();
        const advanced = (payload?.Advanced || '').trim();

        if (!beginner || !intermediate || !advanced) {
          throw new Error('ai-learn-page-invalid-payload');
        }

        if (!cancelled) {
          setLevelDescriptions({
            Beginner: beginner,
            Intermediate: intermediate,
            Advanced: advanced,
          });
        }
      } catch {
        if (!cancelled) {
          setLevelDescriptions(defaultLevelDescriptions);
        }
      }
    };

    loadAILessonDescriptions();

    return () => {
      cancelled = true;
    };
  }, [appState.targetLanguage, appState.nativeLanguage, isGuestMode]);

  useEffect(() => {
    if (isGuestMode || !hasLoggedInUser) {
      setLeaderboardEntries([]);
      return;
    }

    let cancelled = false;

    const loadLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('leaderboard-request-failed');
        }

        const data = await response.json();
        const entries = Array.isArray(data?.entries) ? data.entries : [];

        if (!cancelled) {
          setLeaderboardEntries(entries);
        }
      } catch {
        if (!cancelled) {
          setLeaderboardEntries([]);
        }
      }
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [isGuestMode, hasLoggedInUser, appState.totalXP, appState.stars, appState.learnedWords.length]);

  const beginnerWords = aiVocabulary.filter((item) => item.difficulty === 'beginner');
  const intermediateWords = aiVocabulary.filter((item) => item.difficulty === 'intermediate');
  const advancedWords = aiVocabulary.filter((item) => item.difficulty === 'advanced');

  const beginnerCount = beginnerWords.length || 20;
  const intermediateCount = intermediateWords.length || 20;
  const advancedCount = advancedWords.length || 8;

  const totalWords = beginnerCount + intermediateCount + advancedCount;

  const warmUpTarget = Math.min(totalWords, 6);
  const wordBuilderTarget = Math.min(totalWords, 12);
  const phraseBuilderTarget = Math.min(totalWords, 18);
  const sentencePhaseTarget = Math.max(3, Math.min(sentenceData.length, 6));
  const sentenceMasteryTarget = Math.max(sentencePhaseTarget, Math.min(sentenceData.length, 10));

  const vocabularyProgress = Math.min(appState.learnedWords.length, totalWords);
  const sentenceProgress = Math.min(appState.sentenceAnswersInCycle, sentenceData.length);
  const quizProgress = Math.min(appState.quizAnswersInCycle, 15);

  const roadmapNodes = [
    {
      title: 'Warm Up 1',
      icon: '🐣',
      description: levelDescriptions.Beginner,
      hint: 'Phase 1 · Vocabulary',
      tone: 'from-[#FF9126] to-[#ffb35a]',
      page: 'vocabulary' as Page,
      progress: Math.min(vocabularyProgress, warmUpTarget),
      total: warmUpTarget,
      unlocked: true,
      buttonText: 'Start Warm Up',
      startIndex: 0,
    },
    {
      title: 'Word Builder 2',
      icon: '🌱',
      description: `${levelDescriptions.Beginner} Add more core words with confidence.`,
      hint: 'Phase 1 · Vocabulary',
      tone: 'from-[#56b8e8] to-[#2f9de4]',
      page: 'vocabulary' as Page,
      progress: Math.max(0, Math.min(vocabularyProgress - warmUpTarget, wordBuilderTarget - warmUpTarget)),
      total: Math.max(1, wordBuilderTarget - warmUpTarget),
      unlocked: vocabularyProgress >= warmUpTarget,
      buttonText: 'Start Word Builder 2',
      startIndex: warmUpTarget,
    },
    {
      title: 'Phrase Builder 3',
      icon: '🌉',
      description: `${levelDescriptions.Intermediate} Connect words into stronger phrase flow.`,
      hint: 'Phase 1 · Vocabulary',
      tone: 'from-[#7ed6ff] to-[#56b8e8]',
      page: 'vocabulary' as Page,
      progress: Math.max(0, Math.min(vocabularyProgress - wordBuilderTarget, phraseBuilderTarget - wordBuilderTarget)),
      total: Math.max(1, phraseBuilderTarget - wordBuilderTarget),
      unlocked: vocabularyProgress >= wordBuilderTarget,
      buttonText: 'Start Phrase Builder 3',
      startIndex: wordBuilderTarget,
    },
    {
      title: 'Sentence Practice 1',
      icon: '🧠',
      description: 'Phase 2 begins. Use fill-in-the-blank sentence training.',
      hint: 'Phase 2 · Sentence Practice',
      tone: 'from-[#ffd166] to-[#ff9f43]',
      page: 'sentence' as Page,
      progress: Math.min(sentenceProgress, sentencePhaseTarget),
      total: sentencePhaseTarget,
      unlocked: vocabularyProgress >= phraseBuilderTarget,
      buttonText: 'Start Sentence Practice',
      sentenceStartIndex: 0,
    },
    {
      title: 'Sentence Practice 2',
      icon: '💬',
      description: 'Strengthen grammar and speed with tougher sentence rounds.',
      hint: 'Phase 2 · Sentence Practice',
      tone: 'from-[#c8a4ff] to-[#8f66db]',
      page: 'sentence' as Page,
      progress: Math.max(0, Math.min(sentenceProgress - sentencePhaseTarget, sentenceMasteryTarget - sentencePhaseTarget)),
      total: Math.max(1, sentenceMasteryTarget - sentencePhaseTarget),
      unlocked: vocabularyProgress >= phraseBuilderTarget && sentenceProgress >= sentencePhaseTarget,
      buttonText: 'Continue Sentence Practice',
      sentenceStartIndex: sentencePhaseTarget,
    },
    {
      title: 'Master Checkpoint',
      icon: '🏆',
      description: 'Review words, pass quizzes, and lock in full-cycle mastery.',
      hint: 'Final Phase · Mastery',
      tone: 'from-[#FF9126] to-[#ffd166]',
      page: 'dashboard' as Page,
      progress: Math.min(3, [vocabularyProgress >= totalWords, sentenceProgress >= sentenceMasteryTarget, quizProgress >= 15].filter(Boolean).length),
      total: 3,
      unlocked: vocabularyProgress >= phraseBuilderTarget,
      buttonText: 'Open Dashboard',
    },
  ];

  const activeRoadmapIndex = roadmapNodes.findIndex((node) => node.unlocked && node.progress < node.total);
  const roadmapFocusIndex = activeRoadmapIndex === -1 ? roadmapNodes.length - 1 : activeRoadmapIndex;
  const overallJourneyProgress = Math.min(
    100,
    Math.round(
      ((Math.min(vocabularyProgress, totalWords) + Math.min(sentenceProgress, sentenceData.length)) /
        Math.max(totalWords + sentenceData.length, 1)) *
        100
    )
  );
  const firstUndiscoveredVocabularyIndex = aiVocabulary.findIndex(
    (item) => !appState.learnedWords.includes(item.id)
  );
  const resumeVocabularyIndex =
    firstUndiscoveredVocabularyIndex === -1
      ? Math.max(aiVocabulary.length - 1, 0)
      : Math.max(firstUndiscoveredVocabularyIndex - 1, 0);
  const hasStartedVocabulary = appState.learnedWords.length > 0;

  const openRoadmapNode = (node: (typeof roadmapNodes)[number]) => {
    if (!node.unlocked) {
      return;
    }

    if (node.page === 'vocabulary' && typeof node.startIndex === 'number') {
      updateState({
        currentVocabIndex: node.startIndex,
      });
    }

    if (node.page === 'sentence' && typeof node.sentenceStartIndex === 'number' && typeof window !== 'undefined') {
      window.sessionStorage.setItem('phonix-sentence-start-index', String(node.sentenceStartIndex));
    }

    navigate(node.page);
  };

  return (
    // Dashboard Page Container
    <div className="theme-page min-h-screen px-4 py-5 text-slate-100 lg:px-6">
      {/* Dashboard Content Wrapper */}
      <div className="mx-auto max-w-6xl">
        {/* Main Grid: Primary Content + Optional Right Rail */}
        <div className={`grid gap-5 ${showRightRail ? 'lg:grid-cols-[minmax(0,1fr),320px]' : ''}`}>
          {/* Left Column: Progress + Roadmap */}
          <section>
            {/* Guest Welcome Panel */}
            {isGuestMode && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                className="theme-surface mb-5 rounded-2xl border p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#FAC775]">Welcome to Phonix</p>
                <h2 className="theme-title mt-1 font-baloo text-3xl font-bold">Learn Hiligaynon fast with guided lessons and AI support</h2>
                <p className="theme-muted mt-2 text-sm font-semibold">
                  Practice words, run quick quizzes, scan real-world text, and build your vocabulary step by step.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="theme-surface-soft rounded-xl border p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FAC775]">1. Play Lessons</p>
                    <p className="theme-muted mt-1 text-sm font-semibold">Finish fun word missions and unlock new checkpoints.</p>
                  </div>
                  <div className="theme-surface-soft rounded-xl border p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FAC775]">2. Explore</p>
                    <p className="theme-muted mt-1 text-sm font-semibold">Scan real text to discover extra words from daily life.</p>
                  </div>
                  <div className="theme-surface-soft rounded-xl border p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FAC775]">3. Keep Streak</p>
                    <p className="theme-muted mt-1 text-sm font-semibold">Stay consistent and grow your streak, stars, and XP.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('landing')}
                    className="rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-[#4a2a00]"
                  >
                    Create Profile
                  </button>
                  <button
                    onClick={() => navigate('scan')}
                    className="rounded-xl border border-[#2a4151] bg-[#56b8e8] px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-[#0a344a]"
                  >
                    Try Scan Mode
                  </button>
                  <button
                    onClick={() => navigate('instructions')}
                    className="rounded-xl border border-[#2a4151] bg-transparent px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] theme-title"
                  >
                    View Full Guide
                  </button>
                </div>
              </motion.div>
            )}

            {/* Logged-in Progress Summary */}
            {!isGuestMode && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#ff9b3d] px-5 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#fff3de]">Progress</p>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ffc78f]/45">
                      <div
                        className="h-full rounded-full bg-[#ffe7c9]"
                        style={{ width: `${overallJourneyProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#fff3de]">
                      {overallJourneyProgress}% overall progress
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      updateState({
                        currentVocabIndex: resumeVocabularyIndex,
                      });
                      navigate('vocabulary');
                    }}
                    className="shrink-0 self-start rounded-xl border border-[#fff3de]/60 bg-[#fff3de] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#8a4a00] transition hover:bg-white sm:self-center"
                  >
                    {hasStartedVocabulary ? 'Resume' : 'Start'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Learning Roadmap Section */}
            <div className="theme-surface mt-5 rounded-3xl border px-4 py-6 sm:px-6">
              {/* Roadmap Header */}
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FAC775]">Roadmap</p>
                  <h3 className="theme-title mt-1 font-baloo text-4xl font-bold">Your learning route</h3>
                </div>
                <p className="theme-muted text-sm font-semibold">Tap a tile to jump back into vocabulary practice.</p>
              </div>

              <div className="relative mx-auto max-w-4xl">
                <div className="absolute left-5 top-6 h-[calc(100%-3rem)] w-1 rounded-full bg-gradient-to-b from-[#FF9126] via-[#56b8e8] to-[#c8a4ff] opacity-35 sm:left-1/2 sm:-translate-x-1/2" />

                <div className="space-y-4 sm:space-y-6">
                  {roadmapNodes.map((node, index) => {
                    const completion = Math.max(0, Math.min(100, Math.round((node.progress / node.total) * 100)));
                    const isCurrent = index === roadmapFocusIndex;
                    const isOdd = index % 2 === 1;

                    return (
                      <motion.div
                        key={node.title}
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.08 }}
                        className={`relative flex items-start gap-4 sm:gap-6 ${isOdd ? 'sm:flex-row-reverse' : ''}`}
                      >
                        <div className="relative z-10 flex w-10 shrink-0 justify-center sm:w-16">
                          <button
                            onClick={node.unlocked ? () => openRoadmapNode(node) : undefined}
                            disabled={!node.unlocked}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-4 text-lg shadow-lg transition sm:h-16 sm:w-16 sm:text-3xl ${
                              node.unlocked
                                ? `bg-gradient-to-br ${node.tone} border-white/70 text-white hover:scale-105`
                                : 'theme-lock-button cursor-not-allowed'
                            }`}
                            aria-label={node.title}
                          >
                            {node.unlocked ? node.icon : '🔒'}
                          </button>
                        </div>

                        <div className={`flex-1 ${isOdd ? 'sm:pr-12' : 'sm:pl-12'}`}>
                          <div className={`theme-surface-soft rounded-3xl border p-4 sm:p-5 ${isCurrent ? 'ring-2 ring-[#56b8e8]' : ''}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.16em]">{node.hint}</p>
                                <h4 className="theme-title mt-1 font-baloo text-2xl font-bold">{node.title}</h4>
                                <p className="theme-text-soft mt-2 text-sm font-semibold leading-7">{node.description}</p>
                              </div>
                              <div className="rounded-full border border-[color:var(--theme-border)] px-3 py-1.5 text-right">
                                <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.08em]">Level</p>
                                <p className="theme-title font-baloo text-lg font-bold">{index + 1}/{roadmapNodes.length}</p>
                              </div>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--theme-border)]">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${node.tone}`}
                                style={{ width: `${completion}%` }}
                              />
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                              <p className="theme-muted">{node.progress}/{node.total} completed</p>
                              <p className={`font-bold ${node.unlocked ? 'text-[#7ed6ff]' : 'theme-muted'}`}>
                                {node.unlocked ? (isCurrent ? 'Continue here' : 'Unlocked') : 'Locked'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Right Rail: Leaderboard + Stats + Account Actions */}
          {showRightRail && (
            <aside className="space-y-4">
              {/* Leaderboard Card */}
              {!isGuestMode && (
                <div className="theme-surface rounded-2xl border p-4">
                  <h3 className="theme-title text-xl font-bold">Leaderboard</h3>
                  {leaderboardEntries.length === 0 ? (
                    <p className="theme-muted mt-2 text-sm font-semibold">
                      Keep learning. Your rank appears after progress sync.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {leaderboardEntries.map((entry) => {
                        const isCurrentUser =
                          typeof window !== 'undefined' &&
                          (window.localStorage.getItem('user') || '')
                            .toLowerCase()
                            .includes(entry.userKey.toLowerCase());
                        const leaderboardName = (entry.displayName || entry.userKey.split('@')[0] || 'Player').trim();

                        return (
                          <div
                            key={`${entry.userKey}-${entry.rank}`}
                            className={`theme-surface-soft flex items-center justify-between rounded-xl border px-3 py-2 ${
                              isCurrentUser ? 'border-[#56b8e8]' : ''
                            }`}
                          >
                            <div>
                              <p className="theme-title text-sm font-bold">#{entry.rank} {leaderboardName}</p>
                              <p className="theme-muted text-xs font-semibold">
                                {entry.learnedWords} words • {entry.stars} stars • 🔥 {entry.currentStreak}
                              </p>
                            </div>
                            <p className="font-baloo text-2xl font-bold text-[#7ed6ff]">{entry.totalXP}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('instructions')}
                    className="theme-nav-button mt-3 w-full rounded-xl border px-3 py-2 text-sm font-bold uppercase tracking-[0.08em]"
                  >
                    How It Works
                  </button>
                </div>
              )}

              {/* Current Learning Stats Card */}
              {!isGuestMode && (
                <div className="theme-surface rounded-2xl border p-4">
                  <div className="rounded-2xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#fff3de]">Now learning</p>
                    <h3 className="mt-1 font-baloo text-4xl font-bold text-white">{appState.targetLanguage || 'Hiligaynon'}</h3>
                    <p className="text-sm font-bold text-[#ffd9b0]">Ready to practice</p>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    <div className="theme-surface-soft rounded-xl border p-3">
                      <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">Words learned</p>
                      <p className="theme-title mt-1 font-baloo text-4xl font-bold">{appState.learnedWords.length}</p>
                    </div>

                    <div className="theme-surface-soft rounded-xl border p-3">
                      <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">Stars earned</p>
                      <p className="mt-1 font-baloo text-4xl font-bold text-[#ffd166]">{appState.stars}</p>
                    </div>

                    <div className="theme-surface-soft rounded-xl border p-3">
                      <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">Batteries</p>
                      <p className="mt-1 font-baloo text-[1.85rem] leading-none font-bold text-[#ffb86b]">
                        {premium.isPremium
                          ? '∞ Unlimited Batteries'
                          : appState.batteryResetAt
                          ? `${appState.batteriesRemaining} / ${BATTERY_MAX} · ${formatBatteryCountdown(appState.batteryResetAt)}`
                          : `${appState.batteriesRemaining} / ${BATTERY_MAX} batteries`}
                      </p>
                    </div>

                    <div className="theme-surface-soft rounded-xl border p-3">
                      <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">Streak</p>
                      <p className="mt-1 font-baloo text-[1.85rem] leading-none font-bold text-[#ff8e6d]">
                        🔥 {appState.currentStreak} {appState.currentStreak === 1 ? 'day' : 'days'}
                      </p>
                      <p className="theme-muted mt-1 text-xs font-semibold">
                        Best: {appState.longestStreak} {appState.longestStreak === 1 ? 'day' : 'days'}
                      </p>
                    </div>

                    <div className="theme-surface-soft rounded-xl border p-3">
                      <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">XP</p>
                      <p className="mt-1 font-baloo text-4xl font-bold text-[#7ed6ff]">{appState.totalXP}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guest Save Progress Card */}
              {!hasLoggedInUser && (
                <div className="theme-surface rounded-2xl border p-4">
                  <h3 className="theme-title text-xl font-bold">Save your progress</h3>
                  <p className="theme-muted mt-2 text-sm font-semibold">Keep your streak and lesson path synced.</p>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => navigate('landing')}
                      className="w-full rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#4a2a00]"
                    >
                      Create Profile
                    </button>
                    <button
                      onClick={() => navigate(premium.isPremium ? 'scan' : 'premium')}
                      className="w-full rounded-xl border border-[#2a4151] bg-[#56b8e8] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#0a344a]"
                    >
                      {premium.isPremium ? 'Open Scan Mode' : 'Get Unlimited Batteries'}
                    </button>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
