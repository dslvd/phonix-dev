import { useState, useEffect } from 'react';
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
      {/* Stats Grid - Minimal */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="text-center p-2 bg-gray-700 rounded-lg">
          <p className="text-2xl mb-1">📚</p>
          <p className="text-xs text-gray-400">Words</p>
          <p className="font-bold text-lg text-white">{appState.learnedWords.length}</p>
        </div>
        <div className="text-center p-2 bg-gray-700 rounded-lg">
          <p className="text-2xl mb-1">⭐</p>
          <p className="text-xs text-gray-400">Stars</p>
          <p className="font-bold text-lg text-white">{appState.stars}</p>
        </div>
        <div className="text-center p-2 bg-gray-700 rounded-lg">
          <p className="text-2xl mb-1">🔥</p>
          <p className="text-xs text-gray-400">Streak</p>
          <p className="font-bold text-lg text-white">{appState.currentStreak}</p>
        </div>
        <div className="text-center p-2 bg-gray-700 rounded-lg">
          <p className="text-2xl mb-1">⚡</p>
          <p className="text-xs text-gray-400">XP</p>
          <p className="font-bold text-lg text-white">{appState.totalXP}</p>
        </div>
      </div>

      {/* User Info - Minimal */}
      {userData && (
        <div className="bg-gray-700 rounded-lg p-3 mb-6 space-y-2">
          <div>
            <p className="text-xs text-gray-400">NAME</p>
            <p className="font-bold text-white text-sm">{userData.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">LEARNING</p>
            <p className="text-xs text-gray-300">{appState.targetLanguage}</p>
          </div>
        </div>
      )}

      {/* Subscription Badge */}
      <div className="bg-gray-700 rounded-lg p-3 text-center mb-6">
        <p className="text-2xl mb-1">{appState.isPremium ? '✨' : '🔒'}</p>
        <p className="font-bold text-white text-xs">
          {appState.isPremium ? 'Premium' : 'Free'}
        </p>
        {!appState.isPremium && (
          <p className="text-xs text-gray-400 mt-1">{appState.heartsRemaining}/5 left</p>
        )}
      </div>

      {/* Action Buttons - Small */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('collection')}
          className="w-full py-2 px-3 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
        >
          🎒 Backpack
        </button>
        <button
          onClick={() => navigate('setup')}
          className="w-full py-2 px-3 bg-gray-700 text-white text-xs font-bold rounded-lg hover:bg-gray-600 transition-all"
        >
          ⚙️ Settings
        </button>
        {!appState.isPremium && (
          <button
            onClick={() => navigate('premium')}
            className="w-full py-2 px-3 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 transition-all"
          >
            ✨ Premium
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 bg-red-700 text-white text-xs font-bold rounded-lg hover:bg-red-800 transition-all"
        >
          🚪 Logout
        </button>
      </div>
    </SimplePageLayout>
  );
}
