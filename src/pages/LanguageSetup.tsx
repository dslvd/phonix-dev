import { useState } from 'react';
import { motion } from 'framer-motion';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState } from '../App';

interface LanguageSetupProps {
  navigate: (page: Page) => void;
  updateState: (updates: Partial<AppState>) => void;
}

export default function LanguageSetup({ navigate, updateState }: LanguageSetupProps) {
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');

  const handleSubmit = () => {
    if (nativeLanguage && targetLanguage) {
      updateState({ nativeLanguage, targetLanguage });
      navigate('mode');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <NavigationHeader
        onBack={() => navigate('landing')}
        onLogout={() => navigate('landing')}
      />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2">Language Setup 🌍</h1>
            <p className="text-gray-400">Pick your languages</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <label className="block mb-2">
              <span className="text-white font-bold">🗣️ I speak...</span>
            </label>
            <input
              type="text"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              placeholder="E.g. English"
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none text-sm"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <label className="block mb-2">
              <span className="text-white font-bold">🎯 I want to learn...</span>
            </label>
            <input
              type="text"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              placeholder="E.g. Hiligaynon"
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none text-sm"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={handleSubmit}
              disabled={!nativeLanguage || !targetLanguage}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
            >
              Let's Go! 🚀
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
