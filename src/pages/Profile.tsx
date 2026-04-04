import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState } from '../App';

interface ProfileProps {
  navigate: (page: Page) => void;
  appState: AppState;
}

interface UserData {
  name: string;
  email: string;
  picture?: string;
}

export default function Profile({ navigate, appState }: ProfileProps) {
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
      const updatedUser = { ...userData, name: editedName };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUserData(updatedUser);
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('landing');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] px-4 py-5 text-slate-100 lg:px-6">
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d7ffc2]">Your account</p>
          <h1 className="mt-1 font-baloo text-4xl font-bold text-white">Profile</h1>
          <p className="text-sm font-bold text-[#e8ffd5]">Manage your learning journey</p>
        </motion.div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-4"
          >
            <h2 className="text-xl font-bold text-[#d9e8f2]">Account Info</h2>

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
                    <label className="mb-2 block text-sm font-bold text-[#8bb1c7]">Name</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1 rounded-xl border border-[#304656] bg-[#122733] px-4 py-2 font-baloo text-[#dff1ff] outline-none focus:border-[#56b8e8]"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveName}
                          className="rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-2 font-bold text-[#184a00]"
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
                          className="rounded-xl border border-[#2a4151] bg-[#1a3242] px-4 py-2 font-bold text-[#c5d8e5]"
                        >
                          ✕
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-[#304656] bg-[#122733] px-4 py-3">
                        <p className="font-baloo text-lg font-semibold text-[#dff1ff]">{userData.name}</p>
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
                    <label className="mb-2 block text-sm font-bold text-[#8bb1c7]">Email</label>
                    <div className="rounded-xl border border-[#304656] bg-[#122733] px-4 py-3">
                      <p className="font-semibold text-[#cbe4f6]">{userData.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-[#7fa2b8]">
                  <div className="mb-3 text-4xl leading-none">🔒</div>
                  <p>No user data found</p>
                </div>
              )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-4"
          >
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

              <div className="rounded-xl border border-[#304656] bg-[#122733] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8bb1c7]">Current mode</p>
                <p className="mt-1 font-baloo text-2xl font-bold capitalize text-[#dff1ff]">{appState.mode || 'not set'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {!appState.isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5"
          >
            <button
              onClick={() => navigate('premium')}
              className="w-full rounded-2xl border border-[#2a4151] bg-[#0f202a] p-5 text-left transition hover:border-[#56b8e8]"
            >
              <div className="text-center text-[#d9e8f2]">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-3 text-5xl leading-none"
                >
                  ✨
                </motion.div>
                <h3 className="font-baloo text-3xl font-bold text-white">
                  Unlock Unlimited Batteries!
                </h3>
                <p className="mt-2 text-sm font-semibold text-[#7fa2b8]">
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
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <button
            onClick={() => navigate('collection')}
            className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-5 text-center transition hover:border-[#56b8e8]"
          >
            <div>
              <div className="mb-2 text-4xl leading-none">🎒</div>
              <h3 className="font-baloo text-xl font-bold text-white">My Vocabulary</h3>
              <p className="mt-1 text-sm font-semibold text-[#7fa2b8]">View all learned words</p>
            </div>
          </button>

          <button
            onClick={() => navigate('setup')}
            className="rounded-2xl border border-[#2a4151] bg-[#0f202a] p-5 text-center transition hover:border-[#56b8e8]"
          >
            <div>
              <div className="mb-2 text-4xl leading-none">⚙️</div>
              <h3 className="font-baloo text-xl font-bold text-white">Change Language</h3>
              <p className="mt-1 text-sm font-semibold text-[#7fa2b8]">Update your learning preferences</p>
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
            className="rounded-xl border border-[#2a4151] bg-[#112b3a] px-8 py-3 font-bold uppercase tracking-[0.08em] text-[#cbe4f6] transition hover:bg-[#16384b]"
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
