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
import Mascot from './components/Mascot';

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

function getStoredUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem('user');
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as { name?: string; email?: string };
  } catch {
    return null;
  }
}

function getUserKey() {
  const user = getStoredUser();
  const email = (user?.email || '').trim().toLowerCase();
  return email || null;
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
  const [hasHydratedFromCloud, setHasHydratedFromCloud] = useState(false);
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

  const isGuestMode = (() => {
    const user = getStoredUser();
    if (!user) {
      return false;
    }

    const name = (user.name || '').trim().toLowerCase();
    const email = (user.email || '').trim();
    return name === 'guest' || email.length === 0;
  })();
  const userKey = getUserKey();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setHasHydratedFromCloud(false);

    if (!userKey || isGuestMode) {
      setHasHydratedFromCloud(true);
      return;
    }

    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        const response = await fetch(`/api/user-state?userKey=${encodeURIComponent(userKey)}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!cancelled && data?.state) {
          setAppState((prev) => ({ ...prev, ...data.state }));
        }
      } catch (error) {
        console.error('Failed to load state from D1:', error);
      } finally {
        if (!cancelled) {
          setHasHydratedFromCloud(true);
        }
      }
    };

    hydrateFromCloud();

    return () => {
      cancelled = true;
    };
  }, [userKey, isGuestMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!userKey || isGuestMode || !hasHydratedFromCloud) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      fetch('/api/user-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userKey,
          state: appState,
        }),
        signal: controller.signal,
      }).catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Failed to save state to D1:', error);
      });
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [appState, userKey, isGuestMode, hasHydratedFromCloud]);

  const showDesktopSidebar = currentPage === 'dashboard';
  const desktopNavItems: Array<{ label: string; icon: string; page: Page }> = [
    { label: 'Learn', icon: '🏠', page: 'dashboard' },
    { label: 'Words', icon: '🔤', page: 'vocabulary' },
    { label: 'Collection', icon: '🎒', page: 'collection' },
    { label: 'Scan', icon: '📸', page: 'scan' },
    { label: 'Premium', icon: '⭐', page: 'premium' },
  ];
  if (!isGuestMode) {
    desktopNavItems.splice(4, 0, { label: 'Profile', icon: '👤', page: 'profile' });
  }

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
        return isGuestMode
          ? <Landing navigate={navigate} resetAppState={resetAppState} />
          : <Profile navigate={navigate} appState={appState} />;
      case 'premium':
        return <Premium navigate={navigate} appState={appState} updateState={updateState} />;
      default:
        return <Landing navigate={navigate} resetAppState={resetAppState} />;
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#0f1b24]">
        {renderPage()}
        <Mascot
          message="AI Learning Assistant"
          animation="float"
          responseLanguage={appState.nativeLanguage || 'English'}
          pageContext={`Current page: ${currentPage}. Help the learner with quick, actionable guidance for this screen.`}
        />
      </div>
    );
  }

  return (
    <div className={`${showDesktopSidebar ? 'bg-[#08131b] p-4' : 'bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] p-6'} min-h-screen`}>
      <div className={`mx-auto ${showDesktopSidebar ? 'max-w-[1400px] grid grid-cols-[240px,minmax(0,1fr)] gap-4' : 'max-w-7xl'}`}>
        {showDesktopSidebar && (
          <aside className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border border-[#1f3544] bg-[#0b1f2b] p-4 shadow-[0_24px_50px_rgba(0,0,0,0.45)]">
            <div>
              <h1 className="font-baloo text-4xl font-bold text-[#FF9126]">phonix</h1>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#88a8bb]">learning app</p>
            </div>

            <nav className="mt-6 space-y-2">
              {desktopNavItems.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => navigate(item.page)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      isActive
                        ? 'border-[#2f9de4] bg-[#173346] text-[#d4efff]'
                        : 'border-transparent bg-transparent text-[#c5d8e5] hover:border-[#274154] hover:bg-[#112b3a]'
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="uppercase tracking-[0.08em]">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <button
                onClick={() => navigate('landing')}
                className="w-full rounded-xl border border-[#1f3544] bg-[#112b3a] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#cbe4f6] transition hover:bg-[#16384b]"
              >
                Log Out
              </button>
            </div>
          </aside>
        )}

        <main
          className={`min-w-0 overflow-hidden rounded-[28px] ${
            showDesktopSidebar
              ? 'border border-[#1f3544] bg-[#0f1b24] shadow-[0_20px_40px_rgba(0,0,0,0.4)]'
              : 'border border-[#1f3544] bg-[#0f1b24] shadow-[0_20px_40px_rgba(0,0,0,0.4)]'
          } ${showDesktopSidebar ? '' : 'w-full'}`}
        >
          {renderPage()}
        </main>
      </div>

      <Mascot
        message="AI Learning Assistant"
        animation="float"
        responseLanguage={appState.nativeLanguage || 'English'}
        pageContext={`Current page: ${currentPage}. Help the learner with quick, actionable guidance for this screen.`}
      />
    </div>
  );
}

export default App;
