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

function createDefaultAppState(getTodayKey: () => string): AppState {
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
    lastActiveDate: getTodayKey(),
    heartsRemaining: 5,
    isPremium: false,
    scansRemaining: 20,
  };
}

function App() {
  const getTodayKey = () => new Date().toISOString().split('T')[0];
  const getYesterdayKey = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth < 1024;
  });
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [appState, setAppState] = useState<AppState>(() => {
    const defaultState = createDefaultAppState(getTodayKey);

    if (typeof window === 'undefined') {
      return defaultState;
    }

    const storedUser = window.localStorage.getItem('user');
    if (!storedUser) {
      window.localStorage.removeItem('phonix-app-state');
      return defaultState;
    }

    const stored = window.localStorage.getItem('phonix-app-state');
    if (!stored) {
      return defaultState;
    }

    try {
      return { ...defaultState, ...JSON.parse(stored) };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasUser = !!window.localStorage.getItem('user');
    if (currentPage !== 'landing' || hasUser) {
      return;
    }

    const defaultState = createDefaultAppState(getTodayKey);
    window.localStorage.removeItem('phonix-app-state');
    setAppState(defaultState);
  }, [currentPage]);

  useEffect(() => {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    if (appState.lastActiveDate === today) {
      return;
    }

    setAppState((prev) => {
      const nextStreak = prev.lastActiveDate === yesterday ? prev.currentStreak + 1 : 1;
      return {
        ...prev,
        currentStreak: nextStreak,
        longestStreak: Math.max(prev.longestStreak, nextStreak),
        lastActiveDate: today,
      };
    });
  }, [appState.lastActiveDate]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('phonix-app-state', JSON.stringify(appState));
  }, [appState]);

  const navigate = (page: Page) => {
    setCurrentPage(page);
  };

  const updateState = (updates: Partial<AppState>) => {
    setAppState((prev) => ({ ...prev, ...updates }));
  };

  const resetAppState = () => {
    const defaultState = createDefaultAppState(getTodayKey);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('phonix-app-state');
      window.localStorage.removeItem('isPremium');
    }
    setAppState(defaultState);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing navigate={navigate} resetAppState={resetAppState} />;
      case 'setup':
        return <LanguageSetup navigate={navigate} updateState={updateState} />;
      case 'mode':
        return <ModeSelection navigate={navigate} updateState={updateState} />;
      case 'dashboard':
        return <Dashboard navigate={navigate} appState={appState} />;
      case 'scan':
        return <ScanMode navigate={navigate} appState={appState} updateState={updateState} />;
      case 'vocabulary':
        return <VocabularyLearning navigate={navigate} appState={appState} updateState={updateState} />;
      case 'sentence':
        return <SentenceLearning navigate={navigate} appState={appState} updateState={updateState} />;
      case 'collection':
        return <VocabularyCollection navigate={navigate} appState={appState} />;
      case 'profile':
        return <Profile navigate={navigate} appState={appState} />;
      case 'premium':
        return <Premium navigate={navigate} appState={appState} updateState={updateState} />;
      default:
        return <Landing navigate={navigate} resetAppState={resetAppState} />;
    }
  };

  if (isMobile) {
    return <div className="min-h-screen bg-white">{renderPage()}</div>;
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
                  {appState.nativeLanguage ? `From ${appState.nativeLanguage}` : 'Set up your first lesson to begin'}
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
                  {appState.isPremium ? '∞ Unlimited Batteries' : `${appState.heartsRemaining} / 5 batteries`}
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
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
