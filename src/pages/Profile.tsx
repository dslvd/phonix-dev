import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState, UpdateStateFn } from '../App';
import { usePremium } from '../lib/usePremium';
import { formatBatteryCountdown } from '../lib/battery';

interface ProfileProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: UpdateStateFn;
  premium: ReturnType<typeof usePremium>;
}

interface UserData {
  name: string;
  email: string;
  picture?: string;
}

export default function Profile({ navigate, appState, updateState, premium }: ProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      setEditedName(user.name);
    }
  }, []);

  const handleSaveName = () => {
    if (userData && editedName.trim()) {
      const nextName = editedName.trim();
      const updatedUser = { ...userData, name: nextName };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUserData(updatedUser);
      updateState({ displayName: nextName });
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('phonix-admin-password');
    navigate('landing');
  };

  return (
    <div className="theme-page min-h-screen px-4 py-5 text-slate-100 lg:px-6">
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={handleLogout}
        title="Profile"
      />

      <div className="mx-auto mt-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] px-5 py-4"
        >
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#fff3de]">Your account</p>
          <h1 className="mt-1 font-baloo text-4xl font-bold text-white">Profile</h1>
          <p className="text-sm font-bold text-[#ffd9b0]">Manage your learning journey</p>
        </motion.div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="theme-surface rounded-2xl border p-4"
          >
            <h2 className="theme-title text-xl font-bold">Account Info</h2>

              {userData ? (
                <div className="mt-4 space-y-4">
                  {userData.picture && (
                    <div className="flex justify-center">
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        src={userData.picture}
                        alt={userData.name}
                        className="h-24 w-24 rounded-full border-4 border-[#2a4151]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="theme-muted mb-2 block text-sm font-bold">Name</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="theme-surface-soft flex-1 rounded-xl border px-4 py-2 font-baloo outline-none focus:border-[#56b8e8]"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveName}
                          className="rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-2 font-bold text-[#4a2a00]"
                        >
                          ✓
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setIsEditing(false);
                            setEditedName(userData.name);
                          }}
                          className="theme-nav-button rounded-xl border px-4 py-2 font-bold"
                        >
                          ✕
                        </motion.button>
                      </div>
                    ) : (
                      <div className="theme-surface-soft flex items-center justify-between rounded-xl border px-4 py-3">
                        <p className="theme-title font-baloo text-lg font-semibold">{userData.name}</p>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setIsEditing(true)}
                          className="text-2xl leading-none"
                        >
                          ✏️
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="theme-muted mb-2 block text-sm font-bold">Email</label>
                    <div className="theme-surface-soft rounded-xl border px-4 py-3">
                      <p className="theme-text-soft font-semibold">{userData.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="theme-muted py-8 text-center">
                  <div className="mb-3 text-4xl leading-none">🔒</div>
                  <p>No user data found</p>
                </div>
              )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="theme-surface rounded-2xl border p-4"
          >
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

              <div className="theme-surface-soft rounded-xl border p-3">
                <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">Current mode</p>
                <p className="theme-title mt-1 font-baloo text-2xl font-bold capitalize">{appState.mode || 'not set'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {!premium.isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5"
          >
            <button
              onClick={() => navigate('premium')}
              className="theme-surface w-full rounded-2xl border p-5 text-left transition hover:border-[#56b8e8]"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-3 text-5xl leading-none"
                >
                  ✨
                </motion.div>
                <h3 className="theme-title font-baloo text-3xl font-bold">
                  Unlock Unlimited Batteries!
                </h3>
                <p className="theme-muted mt-2 text-sm font-semibold">
                  Get unlimited batteries + premium features
                </p>
                <span className="mt-4 inline-block rounded-xl border border-[#2a4151] bg-[#56b8e8] px-5 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-[#0a344a]">Upgrade now</span>
              </div>
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-5 grid gap-4 md:grid-cols-3"
        >
          <button
            onClick={() => navigate('collection')}
            className="theme-surface rounded-2xl border p-5 text-center transition hover:border-[#56b8e8]"
          >
            <div>
              <div className="mb-2 text-4xl leading-none">🎒</div>
              <h3 className="theme-title font-baloo text-xl font-bold">My Vocabulary</h3>
              <p className="theme-muted mt-1 text-sm font-semibold">View all learned words</p>
            </div>
          </button>

          <button
            onClick={() => navigate('instructions')}
            className="theme-surface rounded-2xl border p-5 text-center transition hover:border-[#56b8e8]"
          >
            <div>
              <div className="mb-2 text-4xl leading-none">📘</div>
              <h3 className="theme-title font-baloo text-xl font-bold">How It Works</h3>
              <p className="theme-muted mt-1 text-sm font-semibold">See full app instructions</p>
            </div>
          </button>

          <button
            onClick={() => navigate('setup')}
            className="theme-surface rounded-2xl border p-5 text-center transition hover:border-[#56b8e8]"
          >
            <div>
              <div className="mb-2 text-4xl leading-none">⚙️</div>
              <h3 className="theme-title font-baloo text-xl font-bold">Change Language</h3>
              <p className="theme-muted mt-1 text-sm font-semibold">Update your learning preferences</p>
            </div>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="theme-nav-button rounded-xl border px-8 py-3 font-bold uppercase tracking-[0.08em] transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-xl leading-none">🚪</span>
              Log Out
            </span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
