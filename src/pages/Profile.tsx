import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/Card';
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.15),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(217,70,239,0.15),transparent_50%)] -z-10" />
      
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={handleLogout}
        title="Profile"
      />

      <div className="max-w-4xl mx-auto p-4 mt-6">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <img 
              src="/assets/phonix-logo.png" 
              alt="Phonix Logo" 
              className="w-64 h-auto mx-auto drop-shadow-2xl"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-baloo text-5xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
              Your Profile
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-300" />
              <p className="text-gray-600 font-semibold">Language Learning Journey</p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-300" />
            </div>
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User Info Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/90 backdrop-blur-xl border-2 border-purple-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl leading-none flex items-center justify-center">👤</div>
                <h2 className="font-baloo text-2xl font-bold text-gray-800">Account Info</h2>
              </div>

              {userData ? (
                <div className="space-y-4">
                  {/* Profile Picture */}
                  {userData.picture && (
                    <div className="flex justify-center mb-6">
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        src={userData.picture}
                        alt={userData.name}
                        className="w-24 h-24 rounded-full border-4 border-purple-300 shadow-lg"
                      />
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Name</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-xl border-2 border-purple-300 focus:border-purple-500 focus:outline-none font-baloo"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveName}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-bold shadow-lg"
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
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl font-bold"
                        >
                          ✕
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-purple-50 px-4 py-3 rounded-xl">
                        <p className="font-baloo text-lg font-semibold text-gray-800">{userData.name}</p>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setIsEditing(true)}
                          className="text-2xl leading-none flex items-center justify-center"
                        >
                          ✏️
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Email</label>
                    <div className="bg-purple-50 px-4 py-3 rounded-xl">
                      <p className="font-semibold text-gray-700">{userData.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3 leading-none flex items-center justify-center">🔒</div>
                  <p>No user data found</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Learning Stats Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/90 backdrop-blur-xl border-2 border-violet-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl leading-none flex items-center justify-center">📊</div>
                <h2 className="font-baloo text-2xl font-bold text-gray-800">Learning Stats</h2>
              </div>

              <div className="space-y-4">
                {/* Words Learned */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Words Learned</span>
                    <span className="text-3xl leading-none flex items-center justify-center">📚</span>
                  </div>
                  <p className="font-baloo text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {appState.learnedWords.length}
                  </p>
                </div>

                {/* Stars Earned */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Stars Earned</span>
                    <span className="text-3xl leading-none flex items-center justify-center">⭐</span>
                  </div>
                  <p className="font-baloo text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {appState.stars}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-xl border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Current Streak</span>
                    <span className="text-3xl leading-none flex items-center justify-center">🔥</span>
                  </div>
                  <p className="font-baloo text-4xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                    {appState.currentStreak}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Best streak: {appState.longestStreak} days</p>
                </div>

                <div className="bg-gradient-to-r from-sky-50 to-cyan-50 p-4 rounded-xl border-2 border-sky-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">XP Earned</span>
                    <span className="text-3xl leading-none flex items-center justify-center">⚡</span>
                  </div>
                  <p className="font-baloo text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                    {appState.totalXP}
                  </p>
                </div>

                {/* Languages */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Learning</span>
                    <span className="text-3xl leading-none flex items-center justify-center">🌍</span>
                  </div>
                  <p className="font-baloo text-xl font-bold text-blue-700">
                    {appState.targetLanguage || 'Not set'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    from {appState.nativeLanguage || 'Not set'}
                  </p>
                </div>

                {/* Current Mode */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Current Mode</span>
                    <span className="text-3xl leading-none flex items-center justify-center">
                      {appState.mode === 'scan' ? '📸' : '📖'}
                    </span>
                  </div>
                  <p className="font-baloo text-xl font-bold text-purple-700 capitalize">
                    {appState.mode || 'Not set'}
                  </p>
                </div>

                {/* Premium Status */}
                <div className={`p-4 rounded-xl border-2 ${
                  appState.isPremium 
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' 
                    : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Subscription</span>
                    <span className="text-3xl leading-none flex items-center justify-center">
                      {appState.isPremium ? '✨' : '🔒'}
                    </span>
                  </div>
                  {appState.isPremium ? (
                    <>
                      <p className="font-baloo text-xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mb-1">
                        Unlimited Hearts
                      </p>
                      <p className="text-sm text-gray-600">Premium Member</p>
                    </>
                  ) : (
                    <>
                      <p className="font-baloo text-xl font-bold text-gray-700 mb-1">
                        Free Plan
                      </p>
                      <p className="text-sm text-gray-600">
                        {appState.heartsRemaining} / 5 batteries left
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Premium Upgrade Card - Show only for non-premium users */}
        {!appState.isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card 
              hover
              className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 border-4 border-yellow-300 cursor-pointer"
              onClick={() => navigate('premium')}
            >
              <div className="text-center text-white p-4">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-7xl mb-4 leading-none flex items-center justify-center"
                >
                  ✨
                </motion.div>
                <h3 className="font-baloo text-4xl font-bold mb-3">
                  Unlock Unlimited Hearts!
                </h3>
                <p className="text-xl mb-4 opacity-90">
                  Get unlimited hearts + premium features
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold">
                    ∞ Unlimited Hearts
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold">
                    📄 Document Translation
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold">
                    🔌 Offline Mode
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold text-xl inline-block shadow-2xl"
                >
                  🚀 Upgrade Now - FREE Demo!
                </motion.div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid md:grid-cols-2 gap-4"
        >
          <Card 
            hover 
            className="bg-gradient-to-br from-violet-100 to-purple-200 border-2 border-violet-300 cursor-pointer"
            onClick={() => navigate('collection')}
          >
            <div className="text-center">
              <div className="text-5xl mb-3 leading-none flex items-center justify-center">🎒</div>
              <h3 className="font-baloo text-xl font-bold text-gray-800 mb-2">My Vocabulary</h3>
              <p className="text-sm text-gray-600">View all learned words</p>
            </div>
          </Card>

          <Card 
            hover 
            className="bg-gradient-to-br from-pink-100 to-rose-200 border-2 border-pink-300 cursor-pointer"
            onClick={() => navigate('setup')}
          >
            <div className="text-center">
              <div className="text-5xl mb-3 leading-none flex items-center justify-center">⚙️</div>
              <h3 className="font-baloo text-xl font-bold text-gray-800 mb-2">Change Language</h3>
              <p className="text-sm text-gray-600">Update your learning preferences</p>
            </div>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl transition-all"
          >
            <span className="flex items-center gap-2">
              <span className="text-xl leading-none flex items-center justify-center">🚪</span>
              Logout
            </span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
