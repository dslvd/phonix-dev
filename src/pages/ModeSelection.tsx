import { motion } from 'framer-motion';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState } from '../App';

interface ModeSelectionProps {
  navigate: (page: Page) => void;
  updateState: (updates: Partial<AppState>) => void;
}

export default function ModeSelection({ navigate, updateState }: ModeSelectionProps) {
  const selectMode = (mode: 'learn' | 'scan') => {
    updateState({ mode });
    // Route to different pages based on mode
    if (mode === 'scan') {
      navigate('scan');
    } else {
      navigate('dashboard');
    }
  };

  return (
    <div className="theme-page min-h-screen text-slate-100">
      <NavigationHeader
        onBack={() => navigate('setup')}
        onLogout={() => navigate('landing')}
        showStats={false}
      />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl w-full">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center font-baloo text-5xl font-bold text-[#dff1ff]"
        >
          Mode Selection 🎮
        </motion.h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Learn Mode */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card hover onClick={() => selectMode('learn')} className="h-full">
              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="text-8xl mb-4 leading-none flex items-center justify-center"
                >
                  📚
                </motion.div>
                <h2 className="mb-3 font-baloo text-3xl font-bold text-[#7ed6ff]">
                  Learn Mode
                </h2>
                <p className="font-semibold text-[#8bb1c7]">
                  Follow structured lessons with vocabulary, sentences, and quizzes
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="text-2xl leading-none flex items-center justify-center">📖</span>
                  <span className="text-2xl leading-none flex items-center justify-center">✍️</span>
                  <span className="text-2xl leading-none flex items-center justify-center">🎯</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Scan Mode */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card hover onClick={() => selectMode('scan')} className="h-full">
              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  className="text-8xl mb-4 leading-none flex items-center justify-center"
                >
                  📸
                </motion.div>
                <h2 className="mb-3 font-baloo text-3xl font-bold text-[#7ed6ff]">
                  Scan Mode
                </h2>
                <p className="font-semibold text-[#8bb1c7]">
                  Point your camera at objects to learn words instantly with AI
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="text-2xl leading-none flex items-center justify-center">📷</span>
                  <span className="text-2xl leading-none flex items-center justify-center">🤖</span>
                  <span className="text-2xl leading-none flex items-center justify-center">✨</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="mb-4 font-bold text-[#cbe4f6]">
            Don't worry! You can switch modes anytime 😊
          </p>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
