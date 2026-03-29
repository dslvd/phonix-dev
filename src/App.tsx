import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import LanguageSetup from './pages/LanguageSetup';
import ModeSelection from './pages/ModeSelection';
import Dashboard from './pages/Dashboard';
import ScanMode from './pages/ScanMode';
import VocabularyLearning from './pages/VocabularyLearning';
import SentenceLearning from './pages/SentenceLearning';
import VocabularyCollection from './pages/VocabularyCollection';
import Profile from './pages/Profile';
import Premium from './pages/Premium';

export type Page =
  | 'landing'
  | 'setup'
  | 'mode'
  | 'dashboard'
  | 'scan'
  | 'vocabulary'
  | 'sentence'
  | 'collection'
  | 'profile'
  | 'premium';

export interface AppState {
  nativeLanguage: string;
  targetLanguage: string;
  mode: 'learn' | 'scan' | null;
  currentVocabIndex: number;
  learnedWords: string[];
  stars: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  lastActiveDate: string;
  heartsRemaining: number;
  isPremium: boolean;
  scansRemaining: number;
}

// ─── AppStateManager — encapsulates all state logic ──────────────────────────

class AppStateManager {
  private static readonly STORAGE_KEY = 'phonix-app-state';

  static todayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  static yesterdayKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  static defaultState(): AppState {
    return {
      nativeLanguage: '',
      targetLanguage: '',
      mode: null,
      currentVocabIndex: 0,
      learnedWords: [],
      stars: 0,
      currentStreak: 1,
      longestStreak: 1,
      totalXP: 0,
      lastActiveDate: AppStateManager.todayKey(),
      heartsRemaining: 5,
      isPremium: false,
      scansRemaining: 20,
    };
  }

  static load(): AppState {
    const defaults = AppStateManager.defaultState();
    if (typeof window === 'undefined') return defaults;
    try {
      const stored = window.localStorage.getItem(AppStateManager.STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  }

  static save(state: AppState): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AppStateManager.STORAGE_KEY, JSON.stringify(state));
    }
  }

  static applyStreakUpdate(state: AppState): AppState {
    const today = AppStateManager.todayKey();
    const yesterday = AppStateManager.yesterdayKey();
    if (state.lastActiveDate === today) return state;

    const nextStreak =
      state.lastActiveDate === yesterday ? state.currentStreak + 1 : 1;

    return {
      ...state,
      currentStreak: nextStreak,
      longestStreak: Math.max(state.longestStreak, nextStreak),
      lastActiveDate: today,
    };
  }
}

// ─── Router — maps page keys to components ────────────────────────────────────

class AppRouter {
  static render(
    page: Page,
    navigate: (p: Page) => void,
    appState: AppState,
    updateState: (u: Partial<AppState>) => void,
  ): JSX.Element {
    const props = { navigate, appState, updateState };
    switch (page) {
      case 'landing':    return <Landing navigate={navigate} />;
      case 'setup':      return <LanguageSetup {...props} />;
      case 'mode':       return <ModeSelection {...props} />;
      case 'dashboard':  return <Dashboard navigate={navigate} appState={appState} />;
      case 'scan':       return <ScanMode {...props} />;
      case 'vocabulary': return <VocabularyLearning {...props} />;
      case 'sentence':   return <SentenceLearning {...props} />;
      case 'collection': return <VocabularyCollection navigate={navigate} appState={appState} />;
      case 'profile':    return <Profile navigate={navigate} appState={appState} />;
      case 'premium':    return <Premium {...props} />;
      default:           return <Landing navigate={navigate} />;
    }
  }
}

// ─── App Component ────────────────────────────────────────────────────────────

function App() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : true,
  );
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [appState, setAppState] = useState<AppState>(() => AppStateManager.load());

  // Responsive listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Streak update
  useEffect(() => {
    setAppState((prev) => {
      const updated = AppStateManager.applyStreakUpdate(prev);
      return updated === prev ? prev : updated;
    });
  }, [appState.lastActiveDate]);

  // Persist state
  useEffect(() => {
    AppStateManager.save(appState);
  }, [appState]);

  const navigate = (page: Page) => setCurrentPage(page);
  const updateState = (updates: Partial<AppState>) =>
    setAppState((prev) => ({ ...prev, ...updates }));

  const page = AppRouter.render(currentPage, navigate, appState, updateState);

  if (isMobile) {
    return <div className="min-h-screen bg-white">{page}</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,192,225,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,145,38,0.2),_transparent_32%),linear-gradient(135deg,_#EBEBEB,_#f6f6f6,_#FFFEA7)] p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-[320px,minmax(0,1fr)] gap-6">
        <aside className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col justify-between overflow-hidden rounded-[32px] border border-white/80 bg-[rgba(235,235,235,0.88)] p-6 shadow-[0_30px_80px_rgba(47,192,225,0.16)] backdrop-blur-2xl">
          <div>
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-3xl text-white shadow-lg">
                  ✨
                </div>
                <div>
                  <p className="font-baloo text-3xl font-bold text-gray-900">Phonix</p>
                  <p className="text-sm font-semibold text-gray-500">Desktop learning hub</p>
                </div>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-primary via-secondary to-sky-400 p-5 text-white shadow-xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">Now learning</p>
                <h2 className="mt-2 font-baloo text-3xl font-bold">
                  {appState.targetLanguage || 'Choose a language'}
                </h2>
                <p className="mt-2 text-sm font-semibold text-white/85">
                  {appState.nativeLanguage
                    ? `From ${appState.nativeLanguage}`
                    : 'Set up your first lesson to begin'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-secondary/20 bg-sky-100 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Words learned</p>
                <p className="mt-2 font-baloo text-4xl font-bold text-secondary-dark">{appState.learnedWords.length}</p>
              </div>
              <div className="rounded-2xl border border-warning/40 bg-yellow-100 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-dark">Stars earned</p>
                <p className="mt-2 font-baloo text-4xl font-bold text-primary">{appState.stars}</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-[rgba(255,145,38,0.08)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-dark">Batteries</p>
                <p className="mt-2 font-baloo text-2xl font-bold text-primary">
                  {appState.isPremium ? '∞ Unlimited Hearts' : `${appState.heartsRemaining} / 5 batteries`}
                </p>
              </div>
              <div className="rounded-2xl border border-warning/50 bg-yellow-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-dark">Streak</p>
                <p className="mt-2 font-baloo text-2xl font-bold text-primary">🔥 {appState.currentStreak} days</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">Best: {appState.longestStreak} days</p>
              </div>
              <div className="rounded-2xl border border-secondary/20 bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-dark">XP</p>
                <p className="mt-2 font-baloo text-4xl font-bold text-secondary-dark">{appState.totalXP}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-[36px] border border-white/80 bg-[rgba(255,255,255,0.96)] shadow-[0_30px_80px_rgba(255,145,38,0.12)]">
          {page}
        </main>
      </div>
    </div>
  );
}

export default App;
