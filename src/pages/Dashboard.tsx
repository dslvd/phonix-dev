import { motion } from 'framer-motion';
import { Page, AppState } from '../App';
import { getBeginnerWords, getIntermediateWords, getAdvancedWords } from '../data/vocabulary';

interface DashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
}

export default function Dashboard({ navigate, appState }: DashboardProps) {
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

  const beginnerWords = getBeginnerWords();
  const intermediateWords = getIntermediateWords();
  const advancedWords = getAdvancedWords();

  const beginnerTotal = beginnerWords.length;
  const intermediateTotal = beginnerTotal + intermediateWords.length;

  const beginnerProgress = Math.min(appState.learnedWords.length, beginnerTotal);
  const intermediateProgress = Math.max(0, Math.min(appState.learnedWords.length - beginnerTotal, intermediateWords.length));
  const advancedProgress = Math.max(0, appState.learnedWords.length - intermediateTotal);

  const levels = [
    {
      name: 'Beginner',
      icon: '⭐',
      unlocked: true,
      progress: beginnerProgress,
      total: beginnerTotal,
      description: ' ',
    },
    {
      name: 'Intermediate',
      icon: '⭐',
      unlocked: appState.learnedWords.length >= beginnerTotal,
      progress: intermediateProgress,
      total: intermediateWords.length,
      description: ' ',
    },
    {
      name: 'Advanced',
      icon: '⭐',
      unlocked: appState.learnedWords.length >= intermediateTotal,
      progress: advancedProgress,
      total: advancedWords.length,
      description: ' ',
    },
  ];

  const activeLessonIndex = levels.findIndex((level) => level.unlocked && level.progress < level.total);
  const lessonIndex = activeLessonIndex === -1 ? levels.length - 1 : activeLessonIndex;
  const totalWords = beginnerWords.length + intermediateWords.length + advancedWords.length;
  const seasonedProgress = Math.min(100, Math.round((appState.learnedWords.length / totalWords) * 100));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] px-4 py-5 text-slate-100 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),320px]">
          <section>
            {!isGuestMode && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] px-5 py-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d7ffc2]">Progress</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#FF9126]">
                  <div
                    className="h-full rounded-full bg-[#FAC775]"
                    style={{ width: `${seasonedProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-bold text-[#e8ffd5]">{seasonedProgress}% complete ({appState.learnedWords.length}/{totalWords} words)</p>
              </motion.div>
            )}

            <div className="mt-5 rounded-3xl border border-[#243949] bg-[#10212c] px-6 py-8">
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
                              : 'cursor-not-allowed border-[#2d3f4b] bg-[#2a3a46] text-[#7f96a7]'
                          }`}
                        >
                          {level.unlocked ? level.icon : '🔒'}
                          {index === lessonIndex && (
                            <span className="absolute -top-9 rounded-lg border border-[#2a404d] bg-[#122633] px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#8fe9ff]">
                              Start
                            </span>
                          )}
                        </button>

                        <div className="flex-1 rounded-2xl border border-[#243949] bg-[#0d1d27] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#79a7c2]">{level.description}</p>
                          <p className="mt-1 text-lg font-bold text-white">{level.name}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#223847]">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#FF9126] to-[#FF9126]" style={{ width: `${completion}%` }} />
                          </div>
                          <p className="mt-2 text-xs font-semibold text-[#7ba2b9]">{level.progress}/{level.total} words complete</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                <div className="pt-3 text-center">
                  <button
                    onClick={() => navigate('scan')}
                    className="rounded-xl border border-[#8457d7] bg-[#b37dff] px-5 py-2.5 text-sm font-bold uppercase tracking-[0.1em] text-[#2c0f5a] transition hover:brightness-105"
                  >
                    Jump Here
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            {!isGuestMode && (
              <div className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-4">
                <h3 className="text-xl font-bold text-[#d9e8f2]">Unlock Leaderboards</h3>
                <p className="mt-2 text-sm font-semibold text-[#7fa2b8]">Complete 9 more lessons to start competing.</p>
              </div>
            )}

            {!isGuestMode && (
              <div className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-4">
                <div className="rounded-2xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d7ffc2]">Now learning</p>
                  <h3 className="mt-1 font-baloo text-4xl font-bold text-white">{appState.targetLanguage || 'Hiligaynon'}</h3>
                  <p className="text-sm font-bold text-[#e8ffd5]">Ready to practice</p>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div className="rounded-xl border border-[#304656] bg-[#122733] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8bb1c7]">Words learned</p>
                    <p className="mt-1 font-baloo text-4xl font-bold text-[#dff1ff]">{appState.learnedWords.length}</p>
                  </div>

                  <div className="rounded-xl border border-[#304656] bg-[#122733] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8bb1c7]">Stars earned</p>
                    <p className="mt-1 font-baloo text-4xl font-bold text-[#ffd166]">{appState.stars}</p>
                  </div>

                  <div className="rounded-xl border border-[#304656] bg-[#122733] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8bb1c7]">Batteries</p>
                    <p className="mt-1 font-baloo text-[1.85rem] leading-none font-bold text-[#ffb86b]">
                      {appState.isPremium ? '∞ Unlimited Batteries' : `${appState.heartsRemaining} / 5 batteries`}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#304656] bg-[#122733] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8bb1c7]">Streak</p>
                    <p className="mt-1 font-baloo text-[1.85rem] leading-none font-bold text-[#ff8e6d]">
                      🔥 {appState.currentStreak} {appState.currentStreak === 1 ? 'day' : 'days'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#8bb1c7]">
                      Best: {appState.longestStreak} {appState.longestStreak === 1 ? 'day' : 'days'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#304656] bg-[#122733] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8bb1c7]">XP</p>
                    <p className="mt-1 font-baloo text-4xl font-bold text-[#7ed6ff]">{appState.totalXP}</p>
                  </div>
                </div>
              </div>
            )}

            {!hasLoggedInUser && (
              <div className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-4">
                <h3 className="text-xl font-bold text-[#d9e8f2]">Save your progress</h3>
                <p className="mt-2 text-sm font-semibold text-[#7fa2b8]">Keep your streak and lesson path synced.</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => navigate('landing')}
                    className="w-full rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#1f4b00]"
                  >
                    Create Profile
                  </button>
                  <button
                    onClick={() => navigate(appState.isPremium ? 'scan' : 'premium')}
                    className="w-full rounded-xl border border-[#2a4151] bg-[#56b8e8] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#0a344a]"
                  >
                    {appState.isPremium ? 'Open Scan Mode' : 'Get Unlimited Batteries'}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
