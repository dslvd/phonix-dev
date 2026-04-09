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
  const nativeLanguageOptions = ['English', 'Filipino'];
  const targetLanguageOptions = ['Hiligaynon'];

  const handleSubmit = () => {
    if (nativeLanguage && targetLanguage) {
      updateState({ nativeLanguage, targetLanguage });
      navigate('mode');
    }
  };

  return (
    // Page Container
    <div className="theme-page min-h-screen">
      {/* Top Navigation */}
      <NavigationHeader
        onBack={() => navigate('landing')}
        onLogout={() => navigate('landing')}
        showStats={false}
      />

      {/* Centered Setup Card Wrapper */}
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        {/* Setup Card */}
        <Card className="max-w-md w-full">
          {/* Page Intro */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="mb-2 font-baloo text-4xl font-bold">
              Language Setup 🌍
            </h1>
            <p className="theme-muted">Tell us about your language journey!</p>
          </motion.div>

          {/* Native Language Selector */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <label className="block mb-3">
              <span className="flex items-center gap-2 text-lg font-bold">
                <span>🗣️</span>
                I speak...
              </span>
            </label>
            <select
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="theme-surface-soft w-full rounded-2xl border px-6 py-4 text-lg font-semibold outline-none transition-all focus:border-[#56b8e8]"
            >
              <option value="" disabled>
                Select a language
              </option>
              {nativeLanguageOptions.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Target Language Selector */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <label className="block mb-3">
              <span className="flex items-center gap-2 text-lg font-bold">
                <span>🎯</span>
                I want to learn...
              </span>
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="theme-surface-soft w-full rounded-2xl border px-6 py-4 text-lg font-semibold outline-none transition-all focus:border-[#56b8e8]"
            >
              <option value="" disabled>
                Select a language
              </option>
              {targetLanguageOptions.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Continue Action */}
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
        </Card>
      </div>
    </div>
  );
}
