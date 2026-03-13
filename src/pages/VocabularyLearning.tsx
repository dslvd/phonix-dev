import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Mascot from '../components/Mascot';
import NavigationHeader from '../components/NavigationHeader';
import Quiz from '../components/Quiz';
import EnergyBar from '../components/EnergyBar';
import { Page, AppState } from '../App';
import { vocabularyData, getBeginnerWords, getIntermediateWords, getAdvancedWords } from '../data/vocabulary';

interface VocabularyLearningProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export default function VocabularyLearning({
  navigate,
  appState,
  updateState,
}: VocabularyLearningProps) {
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [wordsBeforeQuiz, setWordsBeforeQuiz] = useState(3); // Quiz every 3 words
  const [consecutiveWords, setConsecutiveWords] = useState(0);
  const [showOutOfHeartsModal, setShowOutOfHeartsModal] = useState(false);
  
  // Get current difficulty level based on learned words
  const getCurrentDifficultyWords = () => {
    const learnedCount = appState.learnedWords.length;
    if (learnedCount < 20) {
      return getBeginnerWords();
    } else if (learnedCount < 40) {
      return getIntermediateWords();
    } else {
      return getAdvancedWords();
    }
  };
  
  const currentLevelWords = getCurrentDifficultyWords();
  const currentItem = vocabularyData[appState.currentVocabIndex];

  // Check if we should show quiz
  useEffect(() => {
    // Show quiz every 3-4 words (randomly between 3-4)
    if (consecutiveWords >= wordsBeforeQuiz && !isQuizMode) {
      setIsQuizMode(true);
    }
  }, [consecutiveWords, wordsBeforeQuiz, isQuizMode]);

  const handleNext = () => {
    // Add to learned words if not already learned
    if (!appState.learnedWords.includes(currentItem.id)) {
      updateState({
        learnedWords: [...appState.learnedWords, currentItem.id],
      });
    }

    // Increment consecutive words counter
    setConsecutiveWords(prev => prev + 1);

    // Move to next or go to sentence page
    if (appState.currentVocabIndex < vocabularyData.length - 1) {
      updateState({
        currentVocabIndex: appState.currentVocabIndex + 1,
      });
    } else {
      navigate('sentence');
    }
  };

  const handleQuizAnswer = (correct: boolean) => {
    // Award stars for correct answers
    if (correct) {
      updateState({
        stars: appState.stars + 1,
      });
    } else if (!appState.isPremium) {
      const nextHearts = Math.max(0, appState.heartsRemaining - 1);
      updateState({ heartsRemaining: nextHearts });

      if (nextHearts === 0) {
        setIsQuizMode(false);
        setConsecutiveWords(0);
        setShowOutOfHeartsModal(true);
        return;
      }
    }
    
    // Reset quiz mode and counter
    setIsQuizMode(false);
    setConsecutiveWords(0);
    setWordsBeforeQuiz(Math.floor(Math.random() * 2) + 3); // Next quiz in 3-4 words
    
    // Move to next word after quiz
    handleNext();
  };

  const handlePrevious = () => {
    if (appState.currentVocabIndex > 0) {
      updateState({
        currentVocabIndex: appState.currentVocabIndex - 1,
      });
    }
  };

  const playAudio = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(currentItem.nativeWord);
      
      // Configure for Hiligaynon/Filipino pronunciation
      utterance.lang = 'fil-PH'; // Filipino language code
      utterance.rate = 0.75; // Slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to find a Filipino or Tagalog voice
      const voices = window.speechSynthesis.getVoices();
      const filipinoVoice = voices.find(voice => 
        voice.lang.includes('fil') || 
        voice.lang.includes('tl') || 
        voice.lang.includes('PH')
      );
      
      if (filipinoVoice) {
        utterance.voice = filipinoVoice;
        console.log('Using Filipino voice:', filipinoVoice.name);
      } else {
        // Fallback to any available voice
        console.log('No Filipino voice found, using default');
      }
      
      // Add event listeners for debugging
      utterance.onstart = () => console.log('Speech started');
      utterance.onend = () => console.log('Speech ended');
      utterance.onerror = (e) => console.error('Speech error:', e);
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
      alert('Audio playback not supported in this browser. Try Chrome or Safari.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Premium animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(52,211,153,0.15),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.15),transparent_50%)] -z-10" />
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={() => navigate('landing')}
        title="Vocabulary Learning"
        showProgress={true}
        currentProgress={appState.currentVocabIndex + 1}
        totalProgress={vocabularyData.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <EnergyBar
              current={appState.heartsRemaining}
              max={5}
              isPremium={appState.isPremium}
              onUpgrade={() => navigate('premium')}
            />
          </motion.div>

          {isQuizMode ? (
            // Quiz Mode
            <Quiz
              currentWord={currentItem}
              allWords={currentLevelWords}
              onAnswer={handleQuizAnswer}
            />
          ) : (
            // Regular Flashcard Mode
            <>
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Premium Glassmorphism Card */}
            <div className="relative group">
              {/* Glow effect */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-3xl blur-2xl opacity-50"
              />
              
              <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/50 shadow-2xl">
                {/* Emoji Illustration with particle effect */}
                <div className="relative mb-8 flex justify-center items-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="text-[150px] leading-none flex items-center justify-center"
                  >
                    {currentItem.emoji}
                  </motion.div>
                  
                  {/* Floating particles */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [-20, -60, -20],
                        x: [0, (i - 1) * 20, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.8
                      }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl flex items-center justify-center"
                    >
                      ✨
                    </motion.div>
                  ))}
                </div>

                {/* Native Word Section */}
                <div className="mb-8">
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider"
                  >
                    {appState.targetLanguage}
                  </motion.p>
                  <div className="flex items-center justify-center gap-4">
                    <motion.h2 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="font-baloo text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                    >
                      {currentItem.nativeWord}
                    </motion.h2>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={playAudio}
                      className="relative group/btn flex-shrink-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-lg opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                      <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center">
                        <span className="text-2xl leading-none">🔊</span>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* English Translation Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative"
                >
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-inner border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      {appState.nativeLanguage}
                    </p>
                    <h3 className="font-baloo text-5xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      {currentItem.englishWord}
                    </h3>
                  </div>
                </motion.div>

                {/* Category Badge */}
                <div className="mt-6 flex justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 rounded-full border border-emerald-200"
                  >
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      {currentItem.category}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Premium Navigation Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-4 mt-  8"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <button
                onClick={handlePrevious}
                disabled={appState.currentVocabIndex === 0}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                  appState.currentVocabIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white/80 backdrop-blur-lg border-2 border-gray-300 text-gray-700 hover:border-emerald-400 hover:shadow-lg'
                }`}
              >
                ← Previous
              </button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <button
                onClick={handleNext}
                className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-2xl transition-all relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">Next →</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Premium Progress Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 flex justify-center gap-2"
          >
            {vocabularyData.slice(0, Math.min(10, vocabularyData.length)).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === appState.currentVocabIndex
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 w-8 shadow-lg'
                    : appState.learnedWords.includes(item.id)
                    ? 'bg-gradient-to-r from-green-400 to-emerald-400 w-2'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
            {vocabularyData.length > 10 && (
              <div className="text-xs text-gray-500 ml-2 self-center">
                +{vocabularyData.length - 10} more
              </div>
            )}
          </motion.div>
          </>
          )}
        </div>
      </div>

      {/* Mascot */}
      <Mascot
        message={isQuizMode ? "Show me what you've learned! 🎯" : `Great job learning "${currentItem.englishWord}"! 🎉`}
        animation="bounce"
      />

      {showOutOfHeartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🪫</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">Out of Batteries!</h3>
            <p className="mt-3 text-gray-600 font-semibold">
              Every mistake costs 1 battery. Upgrade to premium for unlimited hearts, or come back later and keep practicing.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('premium')}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg"
              >
                Get Unlimited Hearts 💖
              </button>
              <button
                onClick={() => {
                  setShowOutOfHeartsModal(false);
                  navigate('dashboard');
                }}
                className="flex-1 rounded-2xl bg-gray-100 px-6 py-4 font-bold text-gray-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
