import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import NavigationHeader from '../components/NavigationHeader';
import Quiz from '../components/Quiz';
import EnergyBar from '../components/EnergyBar';
import { Page, AppState } from '../App';
import { vocabularyData, getBeginnerWords, getIntermediateWords, getAdvancedWords } from '../data/vocabulary';
import { usePremium } from '../lib/usePremium';

interface VocabularyLearningProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
  premium: ReturnType<typeof usePremium>;
}

export default function VocabularyLearning({
  navigate,
  appState,
  updateState,
  premium,
}: VocabularyLearningProps) {
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [wordsBeforeQuiz, setWordsBeforeQuiz] = useState(3); // Quiz every 3 words
  const [consecutiveWords, setConsecutiveWords] = useState(0);
  const [showOutOfBatteriesModal, setShowOutOfBatteriesModal] = useState(false);
  
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
  const currentItemLearned = appState.learnedWords.includes(currentItem.id);
  const nextIndex = appState.currentVocabIndex + 1;
  const nextItem = nextIndex < vocabularyData.length ? vocabularyData[nextIndex] : null;
  const nextItemLearned = nextItem ? appState.learnedWords.includes(nextItem.id) : false;

  // Check if we should show quiz
  useEffect(() => {
    // Show quiz every 3-4 words (randomly between 3-4)
    if (consecutiveWords >= wordsBeforeQuiz && !isQuizMode && !currentItemLearned) {
      setIsQuizMode(true);
    }
  }, [consecutiveWords, wordsBeforeQuiz, isQuizMode, currentItemLearned]);

  const handleNext = () => {
    const isNewDiscovery = !appState.learnedWords.includes(currentItem.id);
    const tryingToAdvanceIntoNewContent =
      !premium.isPremium &&
      appState.batteriesRemaining === 0 &&
      (!currentItemLearned || (!!nextItem && !nextItemLearned));

    if (tryingToAdvanceIntoNewContent) {
      setShowOutOfBatteriesModal(true);
      return;
    }

    // Add to learned words if not already learned
    if (isNewDiscovery) {
      updateState({
        learnedWords: [...appState.learnedWords, currentItem.id],
        totalXP: appState.totalXP + 10,
      });
      setConsecutiveWords((prev) => prev + 1);
    } else {
      updateState({
        totalXP: appState.totalXP + 2,
      });
      setConsecutiveWords(0);
    }

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
    } else if (!premium.isPremium) {
      const nextBatteries = Math.max(0, appState.batteriesRemaining - 1);
      updateState({ batteriesRemaining: nextBatteries });

      if (nextBatteries === 0) {
        setIsQuizMode(false);
        setConsecutiveWords(0);
        setShowOutOfBatteriesModal(true);
        return;
      }
    } else {
      // Premium users keep learning without losing batteries.
    }
    
    // Reset quiz mode and counter
    setIsQuizMode(false);
    setConsecutiveWords(0);
    setWordsBeforeQuiz(Math.floor(Math.random() * 2) + 3); // Next quiz in 3-4 words
    
    // Move to next word after quiz
    handleNext();
  };

  const handlePrevious = () => {
    setConsecutiveWords(0);
    setIsQuizMode(false);

    if (appState.currentVocabIndex > 0) {
      updateState({
        currentVocabIndex: appState.currentVocabIndex - 1,
      });
    }
  };

  const playAudio = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(currentItem.nativeWord);
      
      // Configure for Hiligaynon/Filipino pronunciation
      utterance.lang = 'fil-PH'; // Filipino language code
      utterance.rate = 0.85;
      utterance.pitch = 0.75;
      utterance.volume = 1.0;

      const speakWithBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const robotVoice = voices.find((voice) => {
          const name = voice.name.toLowerCase();
          return (
            name.includes('robot') ||
            name.includes('siri') ||
            name.includes('fred') ||
            name.includes('david') ||
            name.includes('zira') ||
            name.includes('microsoft') ||
            name.includes('google us english')
          );
        });

        const filipinoVoice = voices.find((voice) => {
          const lang = voice.lang.toLowerCase();
          return lang.includes('fil') || lang.includes('tl') || lang.includes('ph');
        });

        const englishFallback = voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
        utterance.voice = robotVoice || filipinoVoice || englishFallback || voices[0] || null;
        window.speechSynthesis.speak(utterance);
      };

      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          speakWithBestVoice();
        };
      } else {
        speakWithBestVoice();
      }
      
      // Add event listeners for debugging
      utterance.onstart = () => console.log('Speech started');
      utterance.onend = () => console.log('Speech ended');
      utterance.onerror = (e) => console.error('Speech error:', e);
    } else {
      console.error('Speech synthesis not supported');
      alert('Audio playback not supported in this browser. Try Chrome or Safari.');
    }
  };

  return (
    <div className="theme-page min-h-screen flex flex-col">
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
              current={appState.batteriesRemaining}
              max={5}
              isPremium={premium.isPremium}
              onUpgrade={() => navigate('premium')}
            />
          </motion.div>

          {isQuizMode ? (
            // Quiz Mode
            <Quiz
              currentWord={currentItem}
              allWords={currentLevelWords}
              onAnswer={handleQuizAnswer}
              targetLanguage={appState.targetLanguage || 'Hiligaynon'}
              nativeLanguage={appState.nativeLanguage || 'English'}
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
                className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FF9126] via-[#ffb35a] to-[#56b8e8] opacity-50 blur-2xl"
              />
              
              <div className="theme-surface relative rounded-3xl border p-8 shadow-2xl">
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
                    className="theme-muted mb-3 text-sm font-bold uppercase tracking-wider"
                  >
                    {appState.targetLanguage}
                  </motion.p>
                  <div className="flex items-center justify-center gap-4">
                    <motion.h2 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="font-baloo text-6xl font-bold bg-gradient-to-r from-[#FF9126] to-[#FF9126] bg-clip-text text-transparent"
                    >
                      {currentItem.nativeWord}
                    </motion.h2>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => playAudio(e)}
                      className="relative group/btn flex-shrink-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FF9126] to-[#FF9126] rounded-full blur-lg opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center rounded-full bg-gradient-to-r from-[#FF9126] to-[#ffb35a] p-4 text-white shadow-lg">
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
                  <div className="theme-surface-soft rounded-2xl border p-6 shadow-inner">
                    <p className="theme-muted mb-2 text-xs font-bold uppercase tracking-wider">
                      {appState.nativeLanguage}
                    </p>
                    <h3 className="theme-title font-baloo text-5xl font-bold">
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
                    className="inline-flex items-center gap-2 rounded-full border border-[#FF9126] bg-gradient-to-r from-[#FF9126] to-[#ffb35a] px-4 py-2"
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-[#4a2a00]">
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
            className="flex gap-4 mt-8"
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
                    ? 'theme-lock-button cursor-not-allowed'
                    : 'theme-nav-button border text-sm hover:border-[#FF9126] hover:shadow-lg'
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
                className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#FF9126] to-[#ffb35a] shadow-lg hover:shadow-2xl transition-all relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF9126] to-[#FF9126] opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-white transition-colors group-hover:text-[#fff3de]">Next →</span>
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
                    ? 'w-8 bg-gradient-to-r from-[#FF9126] to-[#ffb35a] shadow-lg'
                    : appState.learnedWords.includes(item.id)
                    ? 'w-2 bg-gradient-to-r from-[#FAC775] to-[#ffb35a]'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
            {vocabularyData.length > 10 && (
              <div className="theme-muted ml-2 self-center text-xs">
                +{vocabularyData.length - 10} more
              </div>
            )}
          </motion.div>
          </>
          )}
        </div>
      </div>

      {showOutOfBatteriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🪫</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">Out of Batteries!</h3>
            <p className="mt-3 text-gray-600 font-semibold">
              Every mistake costs 1 battery. Upgrade to premium for unlimited batteries, or come back later and keep practicing.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('premium')}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg"
              >
                Get Unlimited Batteries
              </button>
              <button
                onClick={() => {
                  setShowOutOfBatteriesModal(false);
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
