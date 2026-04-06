import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Page, AppState } from '../App';
import { VocabularyItem } from '../data/vocabulary';
import { vocabularyData } from '../data/vocabulary';
import { usePremium } from '../lib/usePremium';
import { fetchAIVocabulary, getVocabularyLevelCycle, readCachedAIVocabulary, writeCachedAIVocabulary } from '../lib/aiVocabulary';
import { formatBatteryCountdown } from '../lib/battery';

interface DashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
  premium: ReturnType<typeof usePremium>;
}

export default function Dashboard({ navigate, appState, premium }: DashboardProps) {
  const levelCycle = getVocabularyLevelCycle(appState.learnedWords.length);
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

    if (isGuestMode) {
      setAiVocabulary(vocabularyData.slice(0, 47));
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
        const words = await fetchAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
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
  }, [appState.targetLanguage, appState.nativeLanguage, isGuestMode, levelCycle]);

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
  const advancedCount = advancedWords.length || 7;

  const totalWords = beginnerCount + intermediateCount + advancedCount;
  const roadmapNodeTemplates = [
    {
      title: 'Camp Start',
      icon: '🏕️',
      description: levelDescriptions.Beginner,
      hint: 'Launch point',
      tone: 'from-[#FF9126] to-[#ffb35a]',
    },
    {
      title: 'Word Forest',
      icon: '🌲',
      description: `${levelDescriptions.Beginner} Use short bursts to collect more words.`,
      hint: 'Beginner path',
      tone: 'from-[#56b8e8] to-[#2f9de4]',
    },
    {
      title: 'Phrase Path',
      icon: '🪨',
      description: `${levelDescriptions.Intermediate} Start combining what you know.`,
      hint: 'Phrase builder',
      tone: 'from-[#7ed6ff] to-[#56b8e8]',
    },
    {
      title: 'Scan Sprint',
      icon: '📸',
      description: 'Use camera scan and upload tools to collect new words.',
      hint: 'AI quest',
      tone: 'from-[#ff8e6d] to-[#ffb86b]',
    },
    {
      title: 'Conversation Cove',
      icon: '🧭',
      description: 'Practice speaking with guided sentence learning.',
      hint: 'Midway stop',
      tone: 'from-[#ffd166] to-[#ff9f43]',
    },
    {
      title: 'Sentence Summit',
      icon: '⛰️',
      description: 'Unlock advanced structures and stronger language confidence.',
      hint: 'Advanced gate',
      tone: 'from-[#c8a4ff] to-[#8f66db]',
    },
    {
      title: 'Master Peak',
      icon: '🏔️',
      description: 'Finish the full road and keep progressing for mastery.',
      hint: 'Final peak',
      tone: 'from-[#FF9126] to-[#ffd166]',
    },
  ];

  const roadmapTileCount = Math.max(12, Math.ceil(appState.learnedWords.length / 3) + 8);
  const roadmapNodes = Array.from({ length: roadmapTileCount }, (_, index) => {
    const template = roadmapNodeTemplates[index % roadmapNodeTemplates.length];
    const stageNumber = index + 1;
    const stageSize = Math.max(3, Math.ceil(totalWords / 8));
    const progress = Math.min(appState.learnedWords.length, Math.min(totalWords + stageNumber * 2, (index + 1) * stageSize));
    const total = Math.max(stageSize, Math.min(totalWords + stageNumber * 2, stageSize + Math.floor(index / 2)));
    const unlocked = appState.learnedWords.length >= Math.max(0, index * Math.floor(stageSize * 0.8));

    return {
      ...template,
      title: `${template.title} ${stageNumber}`,
      hint: `${template.hint} ${stageNumber}`,
      progress,
      total,
      unlocked,
    };
  });

  const activeRoadmapIndex = roadmapNodes.findIndex((node) => node.unlocked && node.progress < node.total);
  const roadmapFocusIndex = activeRoadmapIndex === -1 ? roadmapNodes.length - 1 : activeRoadmapIndex;
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
                  <button
                    onClick={() => navigate('instructions')}
                    className="rounded-xl border border-[#2a4151] bg-transparent px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] theme-title"
                  >
                    View Full Guide
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

            <div className="theme-surface mt-5 rounded-3xl border px-4 py-6 sm:px-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#FAC775]">Roadmap</p>
                  <h3 className="theme-title mt-1 font-baloo text-3xl font-bold">Your learning route</h3>
                </div>
                <p className="theme-muted text-sm font-semibold">Tap a tile to jump back into vocabulary practice.</p>
              </div>

              <div className="relative mx-auto max-w-4xl">
                <div className="absolute left-5 top-6 h-[calc(100%-3rem)] w-1 rounded-full bg-gradient-to-b from-[#FF9126] via-[#56b8e8] to-[#c8a4ff] opacity-35 sm:left-1/2 sm:-translate-x-1/2" />

                <div className="space-y-4 sm:space-y-6">
                  {roadmapNodes.map((node, index) => {
                    const completion = Math.round((node.progress / node.total) * 100);
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
                            onClick={node.unlocked ? () => navigate('vocabulary') : undefined}
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

          {showRightRail && (
            <aside className="space-y-4">
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
                          ? `${appState.batteriesRemaining} / 5 · ${formatBatteryCountdown(appState.batteryResetAt)}`
                          : `${appState.batteriesRemaining} / 5 batteries`}
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
