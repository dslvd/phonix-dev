import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import SimplePageLayout from '../components/SimplePageLayout';
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('landing');
  };

  return (
    <SimplePageLayout
      title="Your Profile"
      subtitle={userData?.name || 'Guest'}
      showHeader={true}
      onBack={() => navigate('dashboard')}
      onLogout={handleLogout}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
          <div className="text-2xl mb-1">📚</div>
          <p className="text-xs text-gray-600">Words</p>
          <p className="font-baloo font-bold text-xl text-emerald-600">{appState.learnedWords.length}</p>
        </div>
        <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
          <div className="text-2xl mb-1">⭐</div>
          <p className="text-xs text-gray-600">Stars</p>
          <p className="font-baloo font-bold text-xl text-yellow-600">{appState.stars}</p>
        </div>
        <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl border-2 border-orange-200">
          <div className="text-2xl mb-1">🔥</div>
          <p className="text-xs text-gray-600">Streak</p>
          <p className="font-baloo font-bold text-xl text-orange-600">{appState.currentStreak}</p>
        </div>
        <div className="text-center p-3 bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border-2 border-sky-200">
          <div className="text-2xl mb-1">⚡</div>
          <p className="text-xs text-gray-600">XP</p>
          <p className="font-baloo font-bold text-xl text-sky-600">{appState.totalXP}</p>
        </div>
      </div>

      {/* User Info */}
      {userData && (
        <div className="space-y-2">
          <div>
            <p className="text-xs font-bold text-gray-600 mb-1">NAME</p>
            <p className="font-baloo text-lg font-bold text-gray-800">{userData.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 mb-1">EMAIL</p>
            <p className="text-sm text-gray-700">{userData.email || 'No email'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 mb-1">LEARNING</p>
            <p className="text-sm text-gray-700">{appState.targetLanguage} from {appState.nativeLanguage}</p>
          </div>
        </div>
      )}

      {/* Subscription Status */}
      <div className={`p-3 rounded-xl border-2 text-center ${
        appState.isPremium 
          ? 'bg-yellow-50 border-yellow-300' 
          : 'bg-gray-50 border-gray-300'
      }`}>
        <p className="text-2xl mb-1">{appState.isPremium ? '✨' : '🔒'}</p>
        <p className="font-bold text-gray-800">
          {appState.isPremium ? 'Premium Member' : 'Free Plan'}
        </p>
        {!appState.isPremium && (
          <p className="text-xs text-gray-600 mt-1">{appState.heartsRemaining}/5 batteries left</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-4">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate('collection')}
        >
          🎒 View Backpack
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('setup')}
        >
          ⚙️ Change Language
        </Button>
        {!appState.isPremium && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('premium')}
          >
            ✨ Unlock Premium
          </Button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full py-3 bg-red-100 border-2 border-red-300 text-red-600 font-bold rounded-2xl hover:bg-red-200 transition-all"
        >
          🚪 Logout
        </motion.button>
      </div>
    </SimplePageLayout>
  );
}
