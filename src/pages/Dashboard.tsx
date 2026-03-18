import { motion } from 'framer-motion';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState } from '../App';
import { getBeginnerWords, getIntermediateWords, getAdvancedWords } from '../data/vocabulary';

interface DashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
}

export default function Dashboard({ navigate, appState }: DashboardProps) {
  const beginnerWords = getBeginnerWords();
  const intermediateWords = getIntermediateWords();
  const advancedWords = getAdvancedWords();
  
  const beginnerTotal = beginnerWords.length;
  const intermediateTotal = beginnerTotal + intermediateWords.length;

  const beginnerProgress = Math.min(appState.learnedWords.length, beginnerTotal);
  const intermediateProgress = Math.max(0, Math.min(appState.learnedWords.length - beginnerTotal, intermediateWords.length));
  const advancedProgress = Math.max(0, appState.learnedWords.length - intermediateTotal);

  const levels = [
    { 
      name: 'Beginner', 
      icon: '🌱',
      unlocked: true,
      progress: beginnerProgress,
      total: beginnerTotal,
    },
    { 
      name: 'Intermediate', 
      icon: '🌿',
      unlocked: appState.learnedWords.length >= beginnerTotal,
      progress: intermediateProgress,
      total: intermediateWords.length,
    },
    { 
      name: 'Advanced', 
      icon: '🌳',
      unlocked: appState.learnedWords.length >= intermediateTotal,
      progress: advancedProgress,
      total: advancedWords.length,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <NavigationHeader
        onBack={() => navigate('mode')}
        onLogout={() => navigate('landing')}
        onProfile={() => navigate('profile')}
        showStats={true}
        streakCount={appState.currentStreak}
        starCount={appState.stars}
      />

      <div className="max-w-2xl mx-auto p-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back! 👋</h2>
          <p className="text-gray-400">Learning {appState.targetLanguage}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 text-xs font-bold mb-1">STREAK</p>
            <p className="text-white text-2xl font-bold">🔥 {appState.currentStreak}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 text-xs font-bold mb-1">XP</p>
            <p className="text-white text-2xl font-bold">{appState.totalXP}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 text-xs font-bold mb-1">TASKS</p>
            <p className="text-white text-2xl font-bold">2/4</p>
          </div>
        </motion.div>

        <div className="space-y-3 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Learning Path 🗺️</h3>
          {levels.map((level, index) => (
            <motion.button
              key={level.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => level.unlocked && navigate('vocabulary')}
              disabled={!level.unlocked}
              className={`w-full ${level.unlocked ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800 opacity-50 cursor-not-allowed'} rounded-lg p-4 text-left transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{level.icon}</span>
                  <div>
                    <p className="text-white font-bold">{level.name}</p>
                    <p className="text-gray-400 text-sm">{level.progress}/{level.total} words</p>
                  </div>
                </div>
                <div className="text-2xl">{level.unlocked ? '→' : '🔒'}</div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('collection')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
          >
            View Backpack 🎒
          </button>
          <button
            onClick={() => navigate('scan')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
          >
            Scan Mode 📸
          </button>
          {!appState.isPremium && (
            <button
              onClick={() => navigate('premium')}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
            >
              Upgrade Premium ⭐
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
