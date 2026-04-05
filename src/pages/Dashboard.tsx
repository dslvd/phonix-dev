import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Page, AppState } from '../App';
import { VocabularyItem } from '../data/vocabulary';
import { usePremium } from '../lib/usePremium';
import { fetchAIVocabulary, readCachedAIVocabulary, writeCachedAIVocabulary } from '../lib/aiVocabulary';

interface DashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
  premium: ReturnType<typeof usePremium>;
}

export default function Dashboard({ navigate, appState, premium }: DashboardProps) {
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

  const defaultLevelDescriptions: Record<'Beginner' | 'Intermediate' | 'Advanced', string> = {
    Beginner: 'Core everyday words and pronunciation foundations.',
    Intermediate: 'Useful phrase-building words for daily conversations.',
    Advanced: 'Nuanced vocabulary to speak with confidence and depth.',
  };
  const [levelDescriptions, setLevelDescriptions] = useState(defaultLevelDescriptions);

  useEffect(() => {
    const targetLanguage = appState.targetLanguage || 'Hiligaynon';
    const nativeLanguage = appState.nativeLanguage || 'English';

    const cached = readCachedAIVocabulary(targetLanguage, nativeLanguage);
    if (cached.length > 0) {
      setAiVocabulary(cached);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const refreshAIVocabulary = async () => {
      try {
        const words = await fetchAIVocabulary(targetLanguage, nativeLanguage);
        if (cancelled) {
          return;
        }
        setAiVocabulary(words);
        writeCachedAIVocabulary(targetLanguage, nativeLanguage, words);
      } catch {
        // Keep cached AI vocabulary when provider is unavailable.
      }
    };

    refreshAIVocabulary();

    return () => {
      cancelled = true;
    };
  }, [appState.targetLanguage, appState.nativeLanguage]);

  useEffect(() => {
    setLevelDescriptions(defaultLevelDescriptions);

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
  }, [appState.targetLanguage, appState.nativeLanguage]);

  const beginnerWords = aiVocabulary.filter((item) => item.difficulty === 'beginner');
  const intermediateWords = aiVocabulary.filter((item) => item.difficulty === 'intermediate');
  const advancedWords = aiVocabulary.filter((item) => item.difficulty === 'advanced');

  const beginnerCount = beginnerWords.length || 20;
  const intermediateCount = intermediateWords.length || 20;
  const advancedCount = advancedWords.length || 7;
  const beginnerTotal = beginnerCount;
  const intermediateTotal = beginnerTotal + intermediateCount;

  const beginnerProgress = Math.min(appState.learnedWords.length, beginnerTotal);
  const intermediateProgress = Math.max(0, Math.min(appState.learnedWords.length - beginnerTotal, intermediateCount));
  const advancedProgress = Math.max(0, appState.learnedWords.length - intermediateTotal);

  const levels = [
    {
      name: 'Beginner',
      icon: '⭐',
      unlocked: true,
      progress: beginnerProgress,
      total: beginnerTotal,
      description: levelDescriptions.Beginner,
    },
    {
      name: 'Intermediate',
      icon: '⭐',
      unlocked: appState.learnedWords.length >= beginnerTotal,
      progress: intermediateProgress,
      total: intermediateCount,
      description: levelDescriptions.Intermediate,
    },
    {
      name: 'Advanced',
      icon: '⭐',
      unlocked: appState.learnedWords.length >= intermediateTotal,
      progress: advancedProgress,
      total: advancedCount,
      description: levelDescriptions.Advanced,
    },
  ];

  const activeLessonIndex = levels.findIndex((level) => level.unlocked && level.progress < level.total);
  const lessonIndex = activeLessonIndex === -1 ? levels.length - 1 : activeLessonIndex;
  const totalWords = beginnerCount + intermediateCount + advancedCount;
  const seasonedProgress = Math.min(100, Math.round((appState.learnedWords.length / totalWords) * 100));

  return (
    <div className="theme-page min-h-screen px-4 py-5 text-slate-100 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <div className={`grid gap-5 ${showRightRail ? 'xl:grid-cols-[minmax(0,1fr),320px]' : ''}`}>
          <section>
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
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FAC775]">1. Learn</p>
                    <p className="theme-muted mt-1 text-sm font-semibold">Follow bite-sized vocabulary lessons and unlock new levels.</p>
                  </div>
                  <div className="theme-surface-soft rounded-xl border p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FAC775]">2. Scan</p>
                    <p className="theme-muted mt-1 text-sm font-semibold">Translate text from photos instantly with OCR and AI.</p>
                  </div>
                  <div className="theme-surface-soft rounded-xl border p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FAC775]">3. Save Progress</p>
                    <p className="theme-muted mt-1 text-sm font-semibold">Create a profile anytime to sync your streak and XP.</p>
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
                </div>
              </motion.div>
            )}

            {!isGuestMode && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] px-5 py-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#fff3de]">Progress</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#FF9126]">
                  <div
                    className="h-full rounded-full bg-[#FAC775]"
                    style={{ width: `${seasonedProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-bold text-[#ffd9b0]">{seasonedProgress}% complete ({appState.learnedWords.length}/{totalWords} words)</p>
              </motion.div>
            )}

            <div className="theme-surface mt-5 rounded-3xl border px-6 py-8">
              <div className="mx-auto max-w-xl space-y-6">
                {levels.map((level, index) => {
                  const completion = Math.round((level.progress / level.total) * 100);
                  return (
                    <motion.div
                      key={level.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.12 }}
                      className="relative"
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={level.unlocked ? () => navigate('vocabulary') : undefined}
                          className={`relative flex h-20 w-20 items-center justify-center rounded-full border-b-[6px] text-3xl transition ${
                            level.unlocked
                              ? 'border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] text-white hover:scale-105'
                              : 'theme-lock-button cursor-not-allowed'
                          }`}
                        >
                          {level.unlocked ? level.icon : '🔒'}
                          {index === lessonIndex && (
                            <span className="theme-surface-soft absolute -top-9 rounded-lg border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#2f9de4]">
                              Start
                            </span>
                          )}
                        </button>

                        <div className="theme-surface-soft flex-1 rounded-2xl border p-4">
                          <p className="theme-muted text-xs font-bold uppercase tracking-[0.15em]">{level.description}</p>
                          <p className="theme-title mt-1 text-lg font-bold">{level.name}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--theme-border)]">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#FF9126] to-[#FF9126]" style={{ width: `${completion}%` }} />
                          </div>
                          <p className="theme-muted mt-2 text-xs font-semibold">{level.progress}/{level.total} words complete</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              </div>
            </div>
          </section>

          {showRightRail && (
            <aside className="space-y-4">
              {!isGuestMode && (
                <div className="theme-surface rounded-2xl border p-4">
                  <h3 className="theme-title text-xl font-bold">Unlock Leaderboards</h3>
                  <p className="theme-muted mt-2 text-sm font-semibold">Complete 9 more lessons to start competing.</p>
                </div>
              )}

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
                        {premium.isPremium ? '∞ Unlimited Batteries' : `${appState.batteriesRemaining} / 5 batteries`}
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
