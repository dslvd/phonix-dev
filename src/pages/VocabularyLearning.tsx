import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Mascot from '../components/Mascot';
import NavigationHeader from '../components/NavigationHeader';
import Quiz from '../components/Quiz';
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
        totalXP: appState.totalXP + 10,
      });
    } else {
      updateState({
        totalXP: appState.totalXP + 2,
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
    } else {
      // Premium users keep learning without losing hearts.
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
    <div className="min-h-screen bg-gray-900 relative overflow-hidden flex flex-col">
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
          {/* Hearts Display */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-2 mb-6"
          >
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < appState.heartsRemaining ? 'text-2xl' : 'text-gray-600 text-2xl'}>
                ❤️
              </span>
            ))}
          </motion.div>

          {isQuizMode ? (
            <Quiz
              currentWord={currentItem}
              allWords={currentLevelWords}
              onAnswer={handleQuizAnswer}
            />
          ) : (
            <>
              {/* Flashcard - Dark Minimal */}
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="bg-gray-800 rounded-2xl p-6 shadow-2xl mb-4"
              >
                {/* Emoji */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 3, -3, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-6xl mb-6 text-center leading-none flex items-center justify-center"
                >
                  {currentItem.emoji}
                </motion.div>

                {/* Word */}
                <h2 className="text-2xl font-bold text-white text-center mb-4">
                  {currentItem.nativeWord}
                </h2>

                {/* Translation */}
                <p className="text-sm text-gray-400 text-center mb-6">
                  {currentItem.englishWord}
                </p>

                {/* Audio Button */}
                <div className="flex justify-center">
                  <button
                    onClick={(e) => playAudio(e)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <span>🔊</span>
                    Play
                  </button>
                </div>
              </motion.div>

              {/* Navigation Buttons - Small */}
              <div className="flex gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={appState.currentVocabIndex === 0}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                    appState.currentVocabIndex === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  ← Prev
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-2 px-3 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-all"
                >
                  Next →
                </button>
              </div>
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
          <div className="max-w-md w-full rounded-2xl bg-gray-800 p-6 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-5xl leading-none">🪫</div>
            <h3 className="font-bold text-lg text-white mb-2">Out of Batteries!</h3>
            <p className="text-sm text-gray-400 mb-4">
              Mistakes cost batteries. Upgrade to premium for unlimited hearts.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('premium')}
                className="py-2 px-4 bg-yellow-600 text-white font-bold text-sm rounded-lg hover:bg-yellow-700 transition-all"
              >
                Get Unlimited Hearts
              </button>
              <button
                onClick={() => {
                  setShowOutOfHeartsModal(false);
                  navigate('dashboard');
                }}
                className="py-2 px-4 bg-gray-700 text-white font-bold text-sm rounded-lg hover:bg-gray-600 transition-all"
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
