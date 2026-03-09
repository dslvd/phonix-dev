import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
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
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200">
      <NavigationHeader
        onBack={() => navigate('landing')}
        onLogout={() => navigate('landing')}
      />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
      <Card className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-baloo text-4xl font-bold text-gray-800 mb-2">
            Language Setup 🌍
          </h1>
          <p className="text-gray-600">Tell us about your language journey!</p>
        </motion.div>

        {/* Native Language Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <label className="block mb-3">
            <span className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <span>🗣️</span>
              I speak...
            </span>
          </label>
          <input
            type="text"
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
            placeholder="e.g., English, Tagalog"
            className="w-full px-6 py-4 rounded-2xl border-4 border-gray-200 focus:border-primary outline-none text-lg font-semibold transition-all"
          />
        </motion.div>

        {/* Target Language Input */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <label className="block mb-3">
            <span className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <span>🎯</span>
              I want to learn...
            </span>
          </label>
          <input
            type="text"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            placeholder="e.g., Hiligaynon, Bisaya"
            className="w-full px-6 py-4 rounded-2xl border-4 border-gray-200 focus:border-secondary outline-none text-lg font-semibold transition-all"
          />
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={!nativeLanguage || !targetLanguage}
            icon="🚀"
          >
            LET'S GO!
          </Button>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl text-center mt-6 opacity-70 leading-none flex items-center justify-center"
        >
          ✨
        </motion.div>
      </Card>
      </div>
    </div>
  );
}
