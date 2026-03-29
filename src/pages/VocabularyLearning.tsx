import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Mascot from '../components/Mascot';
import NavigationHeader from '../components/NavigationHeader';
import Quiz from '../components/Quiz';
import EnergyBar from '../components/EnergyBar';
import { Page, AppState } from '../App';
import { vocabularyData, getBeginnerWords, getIntermediateWords, getAdvancedWords } from '../data/vocabulary';

// ─── QuizScheduler — encapsulates quiz cadence logic ─────────────────────────

class QuizScheduler {
  private consecutiveWords = 0;
  private wordsBeforeQuiz: number;

  constructor(initialThreshold = 3) {
    this.wordsBeforeQuiz = initialThreshold;
  }

  advance(): void {
    this.consecutiveWords += 1;
  }

  reset(): void {
    this.consecutiveWords = 0;
    // randomise between 3 and 4 words until next quiz
    this.wordsBeforeQuiz = Math.floor(Math.random() * 2) + 3;
  }

  get shouldShowQuiz(): boolean {
    return this.consecutiveWords >= this.wordsBeforeQuiz;
  }
}

// ─── AudioPlayer — encapsulates Web Speech API ───────────────────────────────

class AudioPlayer {
  static speak(text: string, lang = 'fil-PH', rate = 0.85, pitch = 0.75): void {
    if (!('speechSynthesis' in window)) {
      alert('Audio playback not supported in this browser. Try Chrome or Safari.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        AudioPlayer.assignVoice(utterance);
        window.speechSynthesis.speak(utterance);
      };
    } else {
      AudioPlayer.assignVoice(utterance);
      window.speechSynthesis.speak(utterance);
    }
  }

  private static assignVoice(utterance: SpeechSynthesisUtterance): void {
    const voices = window.speechSynthesis.getVoices();
    const robot = voices.find((v) => /robot|siri|fred|david|zira|microsoft|google us english/i.test(v.name));
    const filipino = voices.find((v) => /fil|tl|ph/i.test(v.lang));
    const english = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    utterance.voice = robot ?? filipino ?? english ?? voices[0] ?? null;
  }
}

// ─── Difficulty selector ──────────────────────────────────────────────────────

function getWordsByLearnedCount(learnedCount: number) {
  if (learnedCount < 20) return getBeginnerWords();
  if (learnedCount < 40) return getIntermediateWords();
  return getAdvancedWords();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VocabularyLearningProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export default function VocabularyLearning({ navigate, appState, updateState }: VocabularyLearningProps) {
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [showOutOfHeartsModal, setShowOutOfHeartsModal] = useState(false);
  const [scheduler] = useState(() => new QuizScheduler(3));

  const currentLevelWords = getWordsByLearnedCount(appState.learnedWords.length);
  const currentItem = vocabularyData[appState.currentVocabIndex];

  useEffect(() => {
    if (scheduler.shouldShowQuiz && !isQuizMode) setIsQuizMode(true);
  }, [scheduler.shouldShowQuiz, isQuizMode]);

  const handleNext = () => {
    const isNew = !appState.learnedWords.includes(currentItem.id);
    updateState({
      learnedWords: isNew ? [...appState.learnedWords, currentItem.id] : appState.learnedWords,
      totalXP: appState.totalXP + (isNew ? 10 : 2),
    });

    scheduler.advance();

    if (appState.currentVocabIndex < vocabularyData.length - 1) {
      updateState({ currentVocabIndex: appState.currentVocabIndex + 1 });
    } else {
      navigate('sentence');
    }
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) {
      updateState({ stars: appState.stars + 1 });
    } else if (!appState.isPremium) {
      const next = Math.max(0, appState.heartsRemaining - 1);
      updateState({ heartsRemaining: next });
      if (next === 0) {
        setIsQuizMode(false);
        scheduler.reset();
        setShowOutOfHeartsModal(true);
        return;
      }
    }
    setIsQuizMode(false);
    scheduler.reset();
    handleNext();
  };

  const handlePrevious = () => {
    if (appState.currentVocabIndex > 0)
      updateState({ currentVocabIndex: appState.currentVocabIndex - 1 });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(52,211,153,0.15),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.15),transparent_50%)] -z-10" />

      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={() => navigate('landing')}
        title="Vocabulary Learning"
        showProgress
        currentProgress={appState.currentVocabIndex + 1}
        totalProgress={vocabularyData.length}
      />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <EnergyBar current={appState.heartsRemaining} max={5} isPremium={appState.isPremium} onUpgrade={() => navigate('premium')} />
          </motion.div>

          {isQuizMode ? (
            <Quiz currentWord={currentItem} allWords={currentLevelWords} onAnswer={handleQuizAnswer} />
          ) : (
            <>
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div className="relative group">
                  <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-3xl blur-2xl opacity-50" />
                  <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/50 shadow-2xl">
                    <div className="relative mb-8 flex justify-center items-center">
                      <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-[150px] leading-none flex items-center justify-center">
                        {currentItem.emoji}
                      </motion.div>
                      {[...Array(3)].map((_, i) => (
                        <motion.div key={i} animate={{ y: [-20, -60, -20], x: [0, (i - 1) * 20, 0], opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }} className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl flex items-center justify-center">✨</motion.div>
                      ))}
                    </div>

                    <div className="mb-8">
                      <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">{appState.targetLanguage}</p>
                      <div className="flex items-center justify-center gap-4">
                        <h2 className="font-baloo text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{currentItem.nativeWord}</h2>
                        <motion.button whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); AudioPlayer.speak(currentItem.nativeWord); }} className="relative flex-shrink-0">
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center">
                            <span className="text-2xl leading-none">🔊</span>
                          </div>
                        </motion.button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-inner border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{appState.nativeLanguage}</p>
                      <h3 className="font-baloo text-5xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{currentItem.englishWord}</h3>
                    </div>

                    <div className="mt-6 flex justify-center">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 rounded-full border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{currentItem.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex gap-4 mt-8">
                <button onClick={handlePrevious} disabled={appState.currentVocabIndex === 0} className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all ${appState.currentVocabIndex === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white/80 backdrop-blur-lg border-2 border-gray-300 text-gray-700 hover:border-emerald-400 hover:shadow-lg'}`}>
                  ← Previous
                </button>
                <button onClick={handleNext} className="flex-1 py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-2xl transition-all">
                  Next →
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 flex justify-center gap-2">
                {vocabularyData.slice(0, Math.min(10, vocabularyData.length)).map((item, index) => (
                  <div key={item.id} className={`h-2 rounded-full transition-all duration-300 ${index === appState.currentVocabIndex ? 'bg-gradient-to-r from-emerald-500 to-teal-500 w-8 shadow-lg' : appState.learnedWords.includes(item.id) ? 'bg-gradient-to-r from-green-400 to-emerald-400 w-2' : 'bg-gray-300 w-2'}`} />
                ))}
                {vocabularyData.length > 10 && <div className="text-xs text-gray-500 ml-2 self-center">+{vocabularyData.length - 10} more</div>}
              </motion.div>
            </>
          )}
        </div>
      </div>

      <Mascot message={isQuizMode ? "Show me what you've learned! 🎯" : `Great job learning "${currentItem.englishWord}"! 🎉`} animation="bounce" />

      {showOutOfHeartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🪫</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">Out of Batteries!</h3>
            <p className="mt-3 text-gray-600 font-semibold">Upgrade to premium for unlimited hearts, or come back later.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('premium')} className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg">Get Unlimited Hearts 💖</button>
              <button onClick={() => { setShowOutOfHeartsModal(false); navigate('dashboard'); }} className="flex-1 rounded-2xl bg-gray-100 px-6 py-4 font-bold text-gray-700">Back to Dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
