import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import AdminDashboard from './pages/AdminDashboardPage';
import Instructions from './pages/Instructions';
import Mascot from './components/Mascot';
import Button from './components/Button';
import { usePremium } from './lib/usePremium';
import { clearPremiumStatus } from './lib/premiumService';
import { getVocabularyLevelCycle, prefetchAIVocabularyWindow } from './lib/aiVocabulary';
import { BATTERY_MAX, normalizeBatteryState } from './lib/battery';

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
  | 'instructions'
  | 'profile'
  | 'premium'
  | 'admin';

export type BackpackSource = 'lesson' | 'scan' | 'upload' | 'manual';

export interface BackpackItem {
  id: string;
  nativeText: string;
  translatedText: string;
  source: BackpackSource;
  createdAt: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  emoji?: string;
}

export interface AppState {
  displayName: string;
  nativeLanguage: string;
  targetLanguage: string;
  mode: 'learn' | 'scan' | null;
  currentVocabIndex: number;
  learnedWords: string[];
  quizAnswersInCycle: number;
  sentenceAnswersInCycle: number;
  stars: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  lastActiveDate: string;
  batteriesRemaining: number;
  batteryResetAt: string | null;
  backpackItems: BackpackItem[];
}

export type UpdateStateAction =
  | Partial<AppState>
  | ((prev: AppState) => Partial<AppState>);

export type UpdateStateFn = (updates: UpdateStateAction) => void;

function createDefaultAppState(getTodayKey: () => string, displayName = ''): AppState {
  return {
    displayName: displayName.trim(),
    nativeLanguage: '',
    targetLanguage: '',
    mode: null,
    currentVocabIndex: 0,
    learnedWords: [],
    quizAnswersInCycle: 0,
    sentenceAnswersInCycle: 0,
    stars: 0,
    currentStreak: 1,
    longestStreak: 1,
    totalXP: 0,
    lastActiveDate: getTodayKey(),
    batteriesRemaining: BATTERY_MAX,
    batteryResetAt: null,
    backpackItems: [],
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

  if (window.location.pathname === '/admin') {
    return 'admin';
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
    'instructions',
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hasHydratedFromCloud, setHasHydratedFromCloud] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const [appState, setAppState] = useState<AppState>(() => {
    const storedUser = getStoredUser();
    const defaultState = createDefaultAppState(getTodayKey, storedUser?.name || '');

    if (typeof window === 'undefined') {
      return defaultState;
    }

    const rawStoredUser = window.localStorage.getItem('user');
    if (!rawStoredUser) {
      window.localStorage.removeItem('phonix-app-state');
      return defaultState;
    }

    const stored = window.localStorage.getItem('phonix-app-state');
    if (!stored) {
      return defaultState;
    }

    try {
      const parsed = { ...defaultState, ...JSON.parse(stored) } as AppState;
      const user = getStoredUser();
      const normalizedBatteryState = normalizeBatteryState(
        {
          batteriesRemaining: typeof parsed.batteriesRemaining === 'number' ? parsed.batteriesRemaining : BATTERY_MAX,
          batteryResetAt: typeof parsed.batteryResetAt === 'string' ? parsed.batteryResetAt : null,
        },
        Date.now()
      );

      return {
        ...parsed,
        displayName: (parsed.displayName || user?.name || '').trim(),
        ...normalizedBatteryState,
      };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePopState = () => {
      setCurrentPage(getInitialPage());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  useEffect(() => {
    if (typeof window === 'undefined' || premium.isPremium) {
      return;
    }

    const normalized = normalizeBatteryState(
      {
        batteriesRemaining: appState.batteriesRemaining,
        batteryResetAt: appState.batteryResetAt,
      },
      Date.now()
    );

    if (
      normalized.batteriesRemaining !== appState.batteriesRemaining ||
      normalized.batteryResetAt !== appState.batteryResetAt
    ) {
      setAppState((prev) => ({
        ...prev,
        ...normalized,
      }));
      return;
    }

    if (appState.batteriesRemaining > 0 || !appState.batteryResetAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const next = normalizeBatteryState(
        {
          batteriesRemaining: appState.batteriesRemaining,
          batteryResetAt: appState.batteryResetAt,
        },
        Date.now()
      );

      if (
        next.batteriesRemaining !== appState.batteriesRemaining ||
        next.batteryResetAt !== appState.batteryResetAt
      ) {
        setAppState((prev) => ({
          ...prev,
          ...next,
        }));
      }
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [appState.batteriesRemaining, appState.batteryResetAt, premium.isPremium]);

  const navigate = (page: Page) => {
    setCurrentPage(page);

    if (typeof window !== 'undefined') {
      if (page === 'admin') {
        window.history.pushState({}, '', '/admin');
      } else if (window.location.pathname === '/admin') {
        window.history.pushState({}, '', '/');
      }
    }
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
    <div className="card inline-flex items-center gap-1 rounded-full p-1" role="group" aria-label="Theme mode switch">
      <Button
        onClick={() => setTheme('light')}
        unstyled
        className={`grid h-9 w-9 place-items-center rounded-full text-lg leading-none font-bold transition sm:h-10 sm:w-10 ${
          theme === 'light' ? 'bg-[color:var(--primary)] text-[color:var(--text)]' : 'text-muted'
        }`}
        data-active={theme === 'light'}
        aria-label="Switch to light mode"
        aria-pressed={theme === 'light'}
        title="Light mode"
      >
        <img
          src="/assets/LightMode.png"
          style={{ filter: theme === 'light' ? 'brightness(0.25)' : 'none' , width: '30px', height: '30px' }}
        />
      </Button>
      <Button
        onClick={() => setTheme('dark')}
        unstyled
        className={`grid h-9 w-9 place-items-center rounded-full text-lg leading-none font-bold transition sm:h-10 sm:w-10 ${
          theme === 'dark' ? 'bg-[color:var(--primary)] text-[color:var(--text)]' : 'text-muted'
        }`}
        data-active={theme === 'dark'}
        aria-label="Switch to dark mode"
        aria-pressed={theme === 'dark'}
        title="Dark mode"
      >
        <img
          src="/assets/DarkMode.png"
          style={{ filter: theme === 'light' ? 'brightness(0.25)' : 'none' , width: '30px', height: '30px'}}
        />
      </Button>
   </div>
  );
  
  const updateState: UpdateStateFn = (updates) => {
    setAppState((prev) => {
      const nextUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...nextUpdates };
    });
  };

  const resetAppState = () => {
    const storedUser = getStoredUser();
    const defaultState = createDefaultAppState(getTodayKey, storedUser?.name || '');
    if (typeof window !== 'undefined') {
      const hasLoggedInUser = !!(storedUser?.email || '').trim();
      window.localStorage.removeItem('phonix-app-state');
      window.sessionStorage.removeItem('phonix-admin-password');

      if (!hasLoggedInUser) {
        clearPremiumStatus();
      }
    }
    setAppState({
      ...defaultState,
      ...normalizeBatteryState({ batteriesRemaining: defaultState.batteriesRemaining, batteryResetAt: defaultState.batteryResetAt }, Date.now()),
    });
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
  const levelCycle = getVocabularyLevelCycle(appState.learnedWords.length);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!userKey && !isGuestMode) {
      return;
    }

    const targetLanguage = (appState.targetLanguage || '').trim();
    const nativeLanguage = (appState.nativeLanguage || '').trim();

    if (!targetLanguage || !nativeLanguage) {
      return;
    }

    prefetchAIVocabularyWindow(targetLanguage, nativeLanguage, levelCycle);
  }, [appState.targetLanguage, appState.nativeLanguage, levelCycle, userKey, isGuestMode]);

  const showDesktopSidebar = currentPage === 'dashboard' || currentPage === 'admin';
  const keepMainPanel = currentPage === 'dashboard';
  const shouldShowGlobalMascot = !['landing', 'setup', 'mode', 'scan', 'vocabulary', 'sentence'].includes(currentPage);
  const globalMascotPageContext = (() => {
    const batteryLine = premium.isPremium
      ? 'Battery system: Premium user. Unlimited batteries are active.'
      : appState.batteryResetAt
      ? `Battery system: Free user. Current batteries ${appState.batteriesRemaining}/${BATTERY_MAX}. Battery refill timer is active until ${appState.batteryResetAt}. Free batteries refill automatically after 3 hours when empty.`
      : `Battery system: Free user. Current batteries ${appState.batteriesRemaining}/${BATTERY_MAX}. Free batteries refill automatically after 3 hours when empty.`;

    const pageGuidance: Record<Page, string> = {
      landing: 'Help the learner understand login, guest mode, and how to start.',
      setup: 'Help the learner choose response language and target language.',
      mode: 'Help the learner choose a mode and explain what each mode does.',
      dashboard: 'Help the learner with roadmap progress, lesson flow, batteries, XP, streaks, stars, and Premium.',
      scan: 'Help the learner with scanning, attachments, translations, and battery usage.',
      vocabulary: 'Help the learner with the current word and lesson flow.',
      sentence: 'Help the learner with the current sentence and clue-based practice.',
      collection: 'Help the learner review saved words and understand backpack features.',
      instructions: 'Help the learner understand how the app works.',
      profile: 'Help the learner with profile settings, language settings, and Premium.',
      premium: 'Help the learner understand Premium benefits, especially unlimited batteries.',
      admin: 'Help the admin understand dashboard actions and user management.',
    };

    return [
      `Current page: ${currentPage}.`,
      pageGuidance[currentPage],
      batteryLine,
      `Current XP: ${appState.totalXP}.`,
      `Current stars: ${appState.stars}.`,
      `Current streak: ${appState.currentStreak}.`,
      'If the learner asks whether batteries are rechargeable, explain that free batteries refill automatically after 3 hours when empty, and Premium gives unlimited batteries.',
    ].join(' ');
  })();
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

    if (currentPage === 'dashboard') {
      return isFilipino
        ? 'Magtanong ka tungkol sa batteries, XP, streak, o susunod mong lesson.'
        : 'Ask me about batteries, XP, streaks, or your next lesson.';
    }

    return isFilipino ? 'Andito lang ako kung may kailangan ka!' : 'I’m right here if you need anything!';
  })();
  const desktopNavItems: Array<{ label: string; icon: string; page: Page }> = [
    { label: 'Learn', icon: '🏠', page: 'dashboard' },
    { label: 'Backpack', icon: '🎒', page: 'collection' },
    { label: 'Guide', icon: '📘', page: 'instructions' },
    { label: 'Scan', icon: '📸', page: 'scan' },
    { label: 'Premium', icon: '⭐', page: 'premium' }
  ];
  if (isAdmin) {
    desktopNavItems.push({ label: 'Admin', icon: '🛠️', page: 'admin' });
  }
  if (!isGuestMode) {
    desktopNavItems.splice(3, 0, { label: 'Profile', icon: '👤', page: 'profile' });
  }

  const showMobileNav = !['landing', 'setup', 'mode'].includes(currentPage);
  const mobileHasFixedHeader = ['scan', 'vocabulary', 'sentence', 'collection', 'instructions', 'profile', 'premium'].includes(currentPage);
  const mobileFloatingTopClass = mobileHasFixedHeader ? 'top-[5.5rem]' : 'top-4';

  const renderPage = () => {
    // Route-to-page component switcher
    switch (currentPage) {
      case 'landing':
        return <Landing navigate={navigate} resetAppState={resetAppState} />;
      case 'setup':
        return <LanguageSetup navigate={navigate} updateState={updateState} />;
      case 'mode':
        return <ModeSelection navigate={navigate} updateState={updateState} />;
      case 'dashboard':
        return <Dashboard navigate={navigate} appState={appState} updateState={updateState} premium={premium}/>;
      case 'scan':
        return <ScanMode navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} appState={appState} updateState={updateState} premium={premium}/>;
      case 'vocabulary':
        return <VocabularyLearning navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} appState={appState} updateState={updateState} premium={premium}/>;
      case 'sentence':
        return <SentenceLearning navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} appState={appState} updateState={updateState} />;
      case 'collection':
        return <VocabularyCollection navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} appState={appState} updateState={updateState} />;
      case 'instructions':
        return <Instructions navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} appState={appState} />;
      case 'profile':
        return isGuestMode
          ? <Landing navigate={navigate} resetAppState={resetAppState} />
          : <Profile navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} appState={appState} updateState={updateState} premium={premium}/>;
      case 'premium':
        return <Premium navigate={navigate} openMobileNav={() => setMobileNavOpen(true)} premium={premium} />;
      case 'admin':
        return <AdminDashboard navigate={navigate} appState={appState} premium={premium} />;
      default:
        return <Landing navigate={navigate} resetAppState={resetAppState} />;
    }
  };

  if (isMobile) {
    return (
      // Mobile App Shell
      <div className={`min-h-screen ${showMobileNav && !mobileHasFixedHeader ? 'pt-9' : ''}`}>
        {/* Active Page Content */}
        {renderPage()}
        {showMobileNav && (
          <>
            {!mobileHasFixedHeader && (
            <div className={`fixed left-4 ${mobileFloatingTopClass} z-[80]`}>
              <Button
                onClick={() => setMobileNavOpen(true)}
                unstyled
                className="theme-bg-surface flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_18px_36px_rgba(15,27,36,0.22)]"
                aria-label="Open navigation menu"
              >
                <span className="text-[1.35rem] leading-none">☰</span>
              </Button>
            </div>

            )}
            <AnimatePresence>
              {mobileNavOpen && (
                <>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileNavOpen(false)}
                    className="fixed inset-0 z-[88] bg-slate-950/40"
                    aria-label="Close navigation menu"
                  />
                  <motion.aside
                    initial={{ x: -280, opacity: 0.9 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -280, opacity: 0.9 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                    className="theme-bg-surface fixed inset-y-0 left-0 z-[89] flex w-[min(290px,82vw)] flex-col border-r px-4 pb-5 pt-6 shadow-[0_28px_70px_rgba(15,27,36,0.28)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h1 className="font-montserrat text-3xl font-black" style={{ color: 'var(--primary)' }}>
                          phonix
                        </h1>
                        <p className="text-muted text-[11px] font-bold uppercase tracking-[0.16em]">
                          AI-driven learning app
                        </p>
                      </div>
                      <Button
                        onClick={() => setMobileNavOpen(false)}
                        unstyled
                        className="theme-bg-surface flex h-10 w-10 items-center justify-center rounded-xl border text-lg"
                        aria-label="Close navigation menu"
                      >
                        ×
                      </Button>
                    </div>

                    <nav className="mt-6 space-y-2">
                      {desktopNavItems.map((item) => {
                        const isActive = currentPage === item.page;
                        return (
                          <Button
                            key={item.page}
                            onClick={() => {
                              setMobileNavOpen(false);
                              navigate(item.page);
                            }}
                            unstyled
                            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                              isActive
                                ? 'bg-[color:color-mix(in_srgb,var(--primary)_18%,var(--surface))] text-[var(--text)] border border-[var(--primary)]'
                                : 'text-muted border-transparent bg-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--surface)]'
                            }`}
                          >
                            <span className="text-lg leading-none">{item.icon}</span>
                            <span className="uppercase tracking-[0.08em]">{item.label}</span>
                          </Button>
                        );
                      })}
                    </nav>

                    <div className="mt-auto space-y-3">
                      <Button
                        onClick={() => {
                          setMobileNavOpen(false);
                          resetAppState();
                          navigate('landing');
                        }}
                        unstyled
                        className="btn btn-secondary w-full rounded-xl px-4 py-3 text-sm uppercase tracking-[0.08em]"
                      >
                        {isGuestMode ? 'Exit Guest Mode' : 'Log Out'}
                      </Button>
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </>
        )}
        {/* Floating Theme Toggle */}
        <div className={`fixed right-4 ${mobileFloatingTopClass} z-[70]`}>
          {themeToggle}
        </div>
        {/* Global Mascot Assistant */}
        {shouldShowGlobalMascot && (
          <Mascot
            message={globalMascotMessage}
            animation="float"
            responseLanguage={appState.nativeLanguage || 'English'}
            pageContext={globalMascotPageContext}
          />
        )}
      </div>
    );
  }

  return (
    // Desktop App Shell
    <div className={`${showDesktopSidebar ? 'p-4' : 'p-6'} min-h-screen`}>
      {/* Standalone Theme Toggle (no sidebar layout) */}
      {!showDesktopSidebar && (
        <div className="fixed right-6 top-6 z-[70]">
          {themeToggle}
        </div>
      )}
      {/* Desktop Layout Wrapper */}
      <div className={`mx-auto ${showDesktopSidebar ? 'max-w-[1400px] grid grid-cols-[240px,minmax(0,1fr)] gap-4' : 'max-w-7xl'}`}>
        {/* Left Sidebar Navigation */}
        {showDesktopSidebar && (
          <aside className="card sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] p-4">
            <div>
              <h1 className="font-montserrat text-4xl font-black" style={{ color: 'var(--primary)' }}>phonix</h1>
              <p className="text-muted text-xs font-bold uppercase tracking-[0.16em]">AI-driven learning app</p>
            </div>

            <nav className="mt-6 space-y-2">
              {desktopNavItems.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <Button
                    key={item.page}
                    onClick={() => navigate(item.page)}
                    unstyled
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      isActive
                        ? 'bg-[color:color-mix(in_srgb,var(--primary)_18%,var(--surface))] text-[var(--text)] border border-[var(--primary)]'
                        : 'text-muted border-transparent bg-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--surface)]'
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="uppercase tracking-[0.08em]">{item.label}</span>
                  </Button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <div className="flex justify-center">
                {themeToggle}
              </div>
              <Button
                onClick={() => {
                  resetAppState();
                  navigate('landing');
                }}
                unstyled
                className="btn btn-secondary w-full rounded-xl px-4 py-3 text-sm uppercase tracking-[0.08em]"
              >
                {isGuestMode ? 'Exit Guest Mode' : 'Log Out'}
              </Button>
            </div>
          </aside>
        )}

        {/* Main Page Panel */}
        <main
          className={`min-w-0 ${keepMainPanel ? 'card overflow-hidden rounded-[28px]' : 'w-full overflow-visible bg-transparent border-0 rounded-none shadow-none'} ${showDesktopSidebar ? '' : 'w-full'}`}
        >
          {renderPage()}
        </main>
      </div>

      {/* Global Mascot Assistant */}
      {shouldShowGlobalMascot && (
        <Mascot
          message={globalMascotMessage}
          animation="float"
          responseLanguage={appState.nativeLanguage || 'English'}
          pageContext={globalMascotPageContext}
        />
      )}
    </div>
  );
}

export default App;
