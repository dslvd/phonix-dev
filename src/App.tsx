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
import AdminDashboard from './pages/AdminDashboard';
import Mascot from './components/Mascot';
import { usePremium } from './lib/usePremium';
import { clearPremiumStatus } from './lib/premiumService';

type ThemeMode = 'dark' | 'light';

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
  | 'premium'
  | 'admin';

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
  batteriesRemaining: number;
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
    batteriesRemaining: 5,
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

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem('phonix-theme');
  return stored === 'light' ? 'light' : 'dark';
}

function getInitialPage(): Page {
  if (typeof window === 'undefined') {
    return 'landing';
  }

  const hasUser = !!window.localStorage.getItem('user');
  if (!hasUser) {
    return 'landing';
  }

  const allowedPages: Page[] = [
    'setup',
    'mode',
    'dashboard',
    'scan',
    'vocabulary',
    'sentence',
    'collection',
    'profile',
    'premium',
    'admin',
  ];
  const storedPage = window.localStorage.getItem('phonix-current-page') as Page | null;

  if (storedPage && allowedPages.includes(storedPage)) {
    return storedPage;
  }

  const rawState = window.localStorage.getItem('phonix-app-state');
  if (!rawState) {
    return 'setup';
  }

  try {
    const state = JSON.parse(rawState) as Partial<AppState>;
    const hasLanguageSetup = !!(state.nativeLanguage || '').trim() && !!(state.targetLanguage || '').trim();
    return hasLanguageSetup ? 'dashboard' : 'setup';
  } catch {
    return 'setup';
  }
}

function App() {
  const premium = usePremium();

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
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [hasHydratedFromCloud, setHasHydratedFromCloud] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
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

    window.localStorage.setItem('phonix-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    clearPremiumStatus();
    setAppState(defaultState);
    void premium.refresh();
  }, [currentPage, premium.refresh]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasUser = !!window.localStorage.getItem('user');
    if (!hasUser || currentPage === 'landing') {
      window.localStorage.removeItem('phonix-current-page');
      return;
    }

    window.localStorage.setItem('phonix-current-page', currentPage);
  }, [currentPage]);

  const themeToggle = (
    <div className="theme-toggle inline-flex items-center gap-1 rounded-full p-1" role="group" aria-label="Theme mode switch">
      <button
        onClick={() => setTheme('light')}
        className="theme-toggle-option grid h-9 w-9 place-items-center rounded-full text-lg leading-none font-bold sm:h-10 sm:w-10"
        data-active={theme === 'light'}
        aria-label="Switch to light mode"
        aria-pressed={theme === 'light'}
        title="Light mode"
      >
        <span className="text-base leading-none">☀</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className="theme-toggle-option grid h-9 w-9 place-items-center rounded-full text-lg leading-none font-bold sm:h-10 sm:w-10"
        data-active={theme === 'dark'}
        aria-label="Switch to dark mode"
        aria-pressed={theme === 'dark'}
        title="Dark mode"
      >
        <span className="text-base leading-none">☾</span>
      </button>
    </div>
  );

  const updateState = (updates: Partial<AppState>) => {
    setAppState((prev) => ({ ...prev, ...updates }));
  };

  const resetAppState = () => {
    const defaultState = createDefaultAppState(getTodayKey);
    if (typeof window !== 'undefined') {
      const storedUser = getStoredUser();
      const hasLoggedInUser = !!(storedUser?.email || '').trim();
      window.localStorage.removeItem('phonix-app-state');

      if (!hasLoggedInUser) {
        clearPremiumStatus();
      }
    }
    setAppState(defaultState);
    void premium.refresh();
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
  const isAdmin = (() => {
    const user = getStoredUser();
    if (!user) {
      return false;
    }

    const name = (user.name || '').trim().toLowerCase();
    const email = (user.email || '').trim().toLowerCase();
    return name === 'admin' || email.includes('admin');
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
        const safeUserKey = encodeURIComponent(userKey).replace(/\./g, '%2E');
        const response = await fetch(`/api/user-state?userKey=${safeUserKey}`);
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

  const showDesktopSidebar = currentPage === 'dashboard' || currentPage === 'admin';
  const shouldShowGlobalMascot = currentPage !== 'landing';
  const globalMascotMessage = (() => {
    const isFilipino = (appState.nativeLanguage || '').trim().toLowerCase() === 'filipino';
    const vocabularyMessages = isFilipino
      ? [
          'Kailangan mo ba ng tulong sa word na ito?',
          'Pwede kitang tulungan sa kahulugan o bigkas nito.',
          'Gusto mo bang i-review natin ang salitang ito?',
          'Sabihin mo lang kung gusto mo ng mas madaling paliwanag.',
        ]
      : [
          'Need help with this word?',
          'I can help with the meaning or pronunciation.',
          'Want to review this word together?',
          'Ask me if you want a simpler explanation.',
        ];
    const sentenceMessages = isFilipino
      ? [
          'Gusto mo bang ipaliwanag ko ang sentence na ito?',
          'Pwede kitang tulungan sa kahulugan ng pangungusap na ito.',
          'Sabihin mo lang kung gusto mong himayin natin ito.',
        ]
      : [
          'Want me to explain this sentence?',
          'I can help break down what this sentence means.',
          'Ask me if you want to go through this sentence step by step.',
        ];
    const scanMessages = isFilipino
      ? [
          'Pwede kitang tulungan sa scan o translation.',
          'Kung gusto mo, ipapaliwanag ko ang result ng scan.',
          'Magtanong ka kung gusto mo ng mas malinaw na translation.',
        ]
      : [
          'I can help with scanning or translation.',
          'If you want, I can explain the scan result.',
          'Ask me if you want a clearer translation.',
        ];

    if (currentPage === 'vocabulary') {
      return vocabularyMessages[appState.currentVocabIndex % vocabularyMessages.length];
    }

    if (currentPage === 'sentence') {
      return sentenceMessages[appState.learnedWords.length % sentenceMessages.length];
    }

    if (currentPage === 'scan') {
      return scanMessages[appState.stars % scanMessages.length];
    }

    return isFilipino ? 'Magtanong ka lang kung may kailangan ka.' : 'Ask me if you need help.';
  })();
  const desktopNavItems: Array<{ label: string; icon: string; page: Page }> = [
    { label: 'Learn', icon: '🏠', page: 'dashboard' },
    { label: 'Backpack', icon: '🎒', page: 'collection' },
    { label: 'Scan', icon: '📸', page: 'scan' },
    { label: 'Premium', icon: '⭐', page: 'premium' }
  ];
  if (isAdmin) {
    desktopNavItems.push({ label: 'Admin', icon: '🛠️', page: 'admin' });
  }
  if (!isGuestMode) {
    desktopNavItems.splice(3, 0, { label: 'Profile', icon: '👤', page: 'profile' });
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
        return <Dashboard navigate={navigate} appState={appState} premium={premium}/>;
      case 'scan':
        return <ScanMode navigate={navigate} appState={appState} updateState={updateState} premium={premium}/>;
      case 'vocabulary':
        return <VocabularyLearning navigate={navigate} appState={appState} updateState={updateState} premium={premium}/>;
      case 'sentence':
        return <SentenceLearning navigate={navigate} appState={appState} updateState={updateState} />;
      case 'collection':
        return <VocabularyCollection navigate={navigate} appState={appState} />;
      case 'profile':
        return isGuestMode
          ? <Landing navigate={navigate} resetAppState={resetAppState} />
          : <Profile navigate={navigate} appState={appState} premium={premium}/>;
      case 'premium':
        return <Premium navigate={navigate} premium={premium} />;
      case 'admin':
        return isAdmin
          ? <AdminDashboard navigate={navigate} appState={appState} premium={premium} />
          : <Dashboard navigate={navigate} appState={appState} premium={premium}/>;
      default:
        return <Landing navigate={navigate} resetAppState={resetAppState} />;
    }
  };

  if (isMobile) {
    return (
      <div className="theme-page min-h-screen">
        {renderPage()}
        <div className="fixed right-4 top-4 z-[70]">
          {themeToggle}
        </div>
        {shouldShowGlobalMascot && (
          <Mascot
            message={globalMascotMessage}
            animation="float"
            responseLanguage={appState.nativeLanguage || 'English'}
            pageContext={`Current page: ${currentPage}. Help the learner with quick, actionable guidance for this screen.`}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${showDesktopSidebar ? 'theme-shell p-4' : 'theme-page p-6'} min-h-screen`}>
      {!showDesktopSidebar && (
        <div className="fixed right-6 top-6 z-[70]">
          {themeToggle}
        </div>
      )}
      <div className={`mx-auto ${showDesktopSidebar ? 'max-w-[1400px] grid grid-cols-[240px,minmax(0,1fr)] gap-4' : 'max-w-7xl'}`}>
        {showDesktopSidebar && (
          <aside className="theme-surface-strong sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border p-4">
            <div>
              <h1 className="font-baloo text-4xl font-bold text-[#FF9126]">phonix</h1>
              <p className="theme-muted text-xs font-bold uppercase tracking-[0.16em]">learning app</p>
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
                        ? 'theme-nav-active'
                        : 'theme-text-soft border-transparent bg-transparent hover:border-[#274154] hover:bg-[color:var(--theme-surface-soft)]'
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="uppercase tracking-[0.08em]">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <div className="flex justify-center">
                {themeToggle}
              </div>
              <button
                onClick={() => navigate('landing')}
                className="theme-nav-button w-full rounded-xl border px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] transition"
              >
                Log Out
              </button>
            </div>
          </aside>
        )}

        <main
          className={`min-w-0 overflow-hidden rounded-[28px] ${
            showDesktopSidebar
              ? 'theme-surface-strong border'
              : 'theme-surface-strong border'
          } ${showDesktopSidebar ? '' : 'w-full'}`}
        >
          {renderPage()}
        </main>
      </div>

      {shouldShowGlobalMascot && (
        <Mascot
          message={globalMascotMessage}
          animation="float"
          responseLanguage={appState.nativeLanguage || 'English'}
          pageContext={`Current page: ${currentPage}. Help the learner with quick, actionable guidance for this screen.`}
        />
      )}
    </div>
  );
}

export default App;
