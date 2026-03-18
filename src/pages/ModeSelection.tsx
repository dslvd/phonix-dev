import { motion } from 'framer-motion';
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
    <div className="min-h-screen bg-gray-900">
      <NavigationHeader onBack={() => navigate('setup')} onLogout={() => navigate('landing')} />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <div className="max-w-md w-full">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-center text-white mb-8"
          >
            Choose Mode 🎮
          </motion.h1>

          <div className="space-y-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => selectMode('learn')}
              className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors"
            >
              <div className="text-4xl mb-2">📚</div>
              <p className="text-white font-bold">Learn Mode</p>
              <p className="text-gray-400 text-sm mt-1">Structured lessons</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => selectMode('scan')}
              className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors"
            >
              <div className="text-4xl mb-2">📸</div>
              <p className="text-white font-bold">Scan Mode</p>
              <p className="text-gray-400 text-sm mt-1">Learn with AI camera</p>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
