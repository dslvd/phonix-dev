import { motion } from 'framer-motion';
import NavigationHeader from '../components/NavigationHeader';
import { AppState, Page } from '../App';

interface InstructionsProps {
  navigate: (page: Page) => void;
  appState: AppState;
}

export default function Instructions({ navigate, appState }: InstructionsProps) {
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

  const cards = [
    {
      title: '1) Start Learning',
      icon: '📚',
      body: 'Use Learn mode from the dashboard map. Tap the active node to open vocabulary cards and complete quizzes.',
    },
    {
      title: '2) Build XP and Streak',
      icon: '⚡',
      body: 'XP increases from new words, review taps, and saved scan results. Daily usage keeps your streak growing.',
    },
    {
      title: '3) Use Backpack',
      icon: '🎒',
      body: 'Your Backpack stores lesson words and saved translations from camera scan, file upload, and manual input.',
    },
    {
      title: '4) Scan and Upload',
      icon: '📸',
      body: 'In Scan mode you can scan with camera, upload image/PDF/DOCX/text files, or type manual text for translation.',
    },
    {
      title: '5) Track Rank',
      icon: '🏆',
      body: 'Logged-in users appear on leaderboard ranking by XP, stars, and words learned.',
    },
    {
      title: '6) Upgrade Power',
      icon: '⭐',
      body: 'Premium gives unlimited batteries and uninterrupted learning for longer sessions.',
    },
  ];

  return (
    // Instructions Page Container
    <div className="theme-page min-h-screen px-4 py-5 text-slate-100 lg:px-6">
      {/* Top Navigation */}
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={() => navigate('landing')}
        onProfile={() => navigate('profile')}
        title="How Phonix Works"
      />

      {/* Page Content Wrapper */}
      <div className="mx-auto mt-6 max-w-6xl">
        {/* Guide Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="theme-summary-card rounded-2xl border-b-4 px-5 py-4"
        >
          <p className="theme-summary-label text-xs font-bold uppercase tracking-[0.15em]">Site Guide</p>
          <h1 className="theme-title mt-1 font-baloo text-4xl font-bold">Full Instructions</h1>
          <p className="theme-muted mt-2 text-sm font-semibold">
            Language: {appState.nativeLanguage || 'English'} {'->'} {appState.targetLanguage || 'Hiligaynon'}
          </p>
        </motion.div>

        {/* How-It-Works Cards */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="theme-surface rounded-2xl border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl leading-none">{card.icon}</div>
                <div>
                  <h2 className="theme-title font-baloo text-2xl font-bold">{card.title}</h2>
                  <p className="theme-text-soft mt-2 font-semibold leading-7">{card.body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guest vs Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="theme-surface mt-5 rounded-2xl border p-5"
        >
          <h2 className="theme-title font-baloo text-3xl font-bold">Guest vs Logged-in</h2>
          <ul className="theme-text-soft mt-3 space-y-2 text-sm font-semibold">
            <li>Guest mode is interactive: dashboard, lessons, map progression, and browsing features.</li>
            <li>Logged-in mode enables cloud progress sync, leaderboard ranking, and full account tracking.</li>
            <li>If you want permanent progress history and ranking, create an account from the landing page.</li>
          </ul>
        </motion.div>

        {/* XP Rules Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="theme-surface mt-5 rounded-2xl border p-5"
        >
          <h2 className="theme-title font-baloo text-3xl font-bold">XP Rules</h2>
          <ul className="theme-text-soft mt-3 space-y-2 text-sm font-semibold">
            <li>New vocabulary discovery: +10 XP</li>
            <li>Reviewing known vocabulary: +2 XP</li>
            <li>Saving a new scan/upload/manual translation: +12 XP</li>
            <li>Saving an already-known translation: +3 XP</li>
          </ul>
        </motion.div>

        {/* Bottom Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 pb-6">
          <button
            onClick={() => navigate('dashboard')}
            className="rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#4a2a00]"
          >
            Back to Dashboard
          </button>
          {isGuestMode && (
            <button
              onClick={() => navigate('landing')}
              className="rounded-xl border border-[#2a4151] bg-[#56b8e8] px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#0a344a]"
            >
              Create Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
