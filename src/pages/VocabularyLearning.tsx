import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import NavigationHeader from '../components/NavigationHeader';
import Quiz from '../components/Quiz';
import EnergyBar from '../components/EnergyBar';
import { Page, AppState, BackpackItem, UpdateStateFn } from '../App';
import { VocabularyItem } from '../data/vocabulary';
import { usePremium } from '../lib/usePremium';
import {
  fetchAIVocabulary,
  getFiveStageLevel,
  getVocabularyLevelCycle,
  getVocabularyLevelTheme,
  prefetchAIVocabulary,
  readCachedAIVocabulary,
  writeCachedAIVocabulary,
} from '../lib/aiVocabulary';

interface VocabularyLearningProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: UpdateStateFn;
  premium: ReturnType<typeof usePremium>;
}

export default function VocabularyLearning({
  navigate,
  appState,
  updateState,
  premium,
}: VocabularyLearningProps) {
  const isGuestMode = (() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const rawUser = window.localStorage.getItem('user');
    if (!rawUser) {
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { name?: string; email?: string };
      const name = (user.name || '').trim().toLowerCase();
      const email = (user.email || '').trim();
      return name === 'guest' || email.length === 0;
    } catch {
      return false;
    }
  })();
  const targetLanguage = appState.targetLanguage || 'Hiligaynon';
  const nativeLanguage = appState.nativeLanguage || 'English';
  const levelCycle = getVocabularyLevelCycle(appState.learnedWords.length);
  const levelTheme = getVocabularyLevelTheme(levelCycle);

  const [isQuizMode, setIsQuizMode] = useState(false);
  const [wordsBeforeQuiz, setWordsBeforeQuiz] = useState(3); // Quiz every 3 words
  const [consecutiveWords, setConsecutiveWords] = useState(0);
  const [showOutOfBatteriesModal, setShowOutOfBatteriesModal] = useState(false);
  const [aiVocabulary, setAiVocabulary] = useState<VocabularyItem[]>(() => {
    return readCachedAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
  });
  const [aiFlashcardItem, setAiFlashcardItem] = useState<VocabularyItem | null>(null);

  useEffect(() => {
    const cached = readCachedAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
    if (cached.length > 0) {
      setAiVocabulary(cached);
    }

    if (isGuestMode) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    setAiFlashcardItem(null);
    prefetchAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });

    let cancelled = false;

    const loadAIVocabulary = async () => {
      try {
        const words = await fetchAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
        if (cancelled) {
          return;
        }

        setAiVocabulary(words);
        writeCachedAIVocabulary(targetLanguage, nativeLanguage, words, { levelCycle });
      } catch {
        // Keep using cached AI words when provider is unavailable.
      }
    };

    loadAIVocabulary();

    return () => {
      cancelled = true;
    };
  }, [targetLanguage, nativeLanguage, isGuestMode, levelCycle]);

  useEffect(() => {
    if (appState.currentVocabIndex === 0) {
      return;
    }

    updateState({ currentVocabIndex: 0 });
  }, [levelCycle, appState.currentVocabIndex, updateState]);

  const learnedInCurrentCycle = appState.learnedWords.length % 47;

  const currentLevelWords = (() => {
    const difficulty = learnedInCurrentCycle < 20 ? 'beginner' : learnedInCurrentCycle < 40 ? 'intermediate' : 'advanced';
    return aiVocabulary.filter((item) => item.difficulty === difficulty);
  })();
  const beginnerWords = aiVocabulary.filter((item) => item.difficulty === 'beginner');
  const intermediateWords = aiVocabulary.filter((item) => item.difficulty === 'intermediate');
  const advancedWords = aiVocabulary.filter((item) => item.difficulty === 'advanced');

  const beginnerCount = beginnerWords.length || 20;
  const intermediateCount = intermediateWords.length || 20;
  const advancedCount = advancedWords.length || 7;

  const learnedCount = learnedInCurrentCycle;
  const currentDifficultyBand: 'beginner' | 'intermediate' | 'advanced' =
    learnedCount < beginnerCount
      ? 'beginner'
      : learnedCount < beginnerCount + intermediateCount
      ? 'intermediate'
      : 'advanced';
  const bandProgress =
    currentDifficultyBand === 'beginner'
      ? learnedCount
      : currentDifficultyBand === 'intermediate'
      ? Math.max(0, learnedCount - beginnerCount)
      : Math.max(0, learnedCount - beginnerCount - intermediateCount);
  const bandTotal =
    currentDifficultyBand === 'beginner'
      ? beginnerCount
      : currentDifficultyBand === 'intermediate'
      ? intermediateCount
      : advancedCount;
  const levelStage = getFiveStageLevel(bandProgress, bandTotal);
  const difficultyLabel =
    currentDifficultyBand === 'beginner'
      ? 'Beginner'
      : currentDifficultyBand === 'intermediate'
      ? 'Intermediate'
      : 'Advanced';

  const fallbackItem: VocabularyItem = {
    id: 'ai-loading',
    nativeWord: 'Loading',
    englishWord: 'Loading',
    category: 'general',
    emoji: '🧠',
    difficulty: 'beginner',
  };

  const currentItem = aiVocabulary[appState.currentVocabIndex] || aiVocabulary[0] || fallbackItem;
  const hasAIVocabulary = aiVocabulary.length > 0;
  const displayedItem = aiFlashcardItem || currentItem;
  const currentItemLearned = appState.learnedWords.includes(currentItem.id);
  const nextIndex = appState.currentVocabIndex + 1;
  const nextItem = nextIndex < aiVocabulary.length ? aiVocabulary[nextIndex] : null;
  const nextItemLearned = nextItem ? appState.learnedWords.includes(nextItem.id) : false;

  useEffect(() => {
    if (!hasAIVocabulary) {
      return;
    }

    if (appState.currentVocabIndex < aiVocabulary.length) {
      return;
    }

    updateState({ currentVocabIndex: Math.max(0, aiVocabulary.length - 1) });
  }, [hasAIVocabulary, appState.currentVocabIndex, aiVocabulary.length, updateState]);

  // Check if we should show quiz
  useEffect(() => {
    // Show quiz every 3-4 words (randomly between 3-4)
    if (consecutiveWords >= wordsBeforeQuiz && !isQuizMode && !currentItemLearned) {
      setIsQuizMode(true);
    }
  }, [consecutiveWords, wordsBeforeQuiz, isQuizMode, currentItemLearned]);

  useEffect(() => {
    const stripCodeFence = (text: string) => text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const parseAIFlashcardPayload = (rawText: string) => {
      const cleaned = stripCodeFence(rawText);

      try {
        return JSON.parse(cleaned) as {
          nativeWord?: string;
          englishWord?: string;
          category?: string;
          emoji?: string;
        };
      } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');

        if (start === -1 || end === -1 || end <= start) {
          return null;
        }

        try {
          return JSON.parse(cleaned.slice(start, end + 1)) as {
            nativeWord?: string;
            englishWord?: string;
            category?: string;
            emoji?: string;
          };
        } catch {
          return null;
        }
      }
    };

    setAiFlashcardItem(null);

    if (!hasAIVocabulary) {
      return;
    }

    if (isGuestMode) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const buildAIFlashcard = async () => {
      try {
        const prompt = [
          'You are generating one language-learning flashcard item.',
          `Difficulty level: ${currentItem.difficulty}.`,
          `Target language: ${appState.targetLanguage || 'Hiligaynon'}.`,
          `Learner native language: ${appState.nativeLanguage || 'English'}.`,
          `Reference native word: ${currentItem.nativeWord}.`,
          `Reference English word: ${currentItem.englishWord}.`,
          `Reference category: ${currentItem.category}.`,
          '',
          'Return STRICT JSON only with this shape:',
          '{',
          '  "nativeWord": "string",',
          '  "englishWord": "string",',
          '  "category": "string",',
          '  "emoji": "string"',
          '}',
          '',
          'Rules:',
          '1. Keep nativeWord and englishWord concise and learner-friendly.',
          '2. Preserve the same meaning as the reference word pair.',
          '3. category should stay simple (one short word or phrase).',
        ].join('\n');

        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('ai-flashcard-request-failed');
        }

        const data = await response.json();
        const payload = parseAIFlashcardPayload(String(data?.text || ''));

        const nativeWord = (payload?.nativeWord || '').trim();
        const englishWord = (payload?.englishWord || '').trim();

        if (!nativeWord || !englishWord) {
          throw new Error('ai-flashcard-invalid-payload');
        }

        const nextFlashcard: VocabularyItem = {
          id: currentItem.id,
          nativeWord,
          englishWord,
          category: (payload?.category || currentItem.category).trim() || currentItem.category,
          emoji: (payload?.emoji || currentItem.emoji).trim() || currentItem.emoji,
          difficulty: currentItem.difficulty,
        };

        if (!cancelled) {
          setAiFlashcardItem(nextFlashcard);
        }
      } catch {
        if (!cancelled) {
          setAiFlashcardItem(null);
        }
      }
    };

    buildAIFlashcard();

    return () => {
      cancelled = true;
    };
  }, [
    hasAIVocabulary,
    currentItem.id,
    currentItem.nativeWord,
    currentItem.englishWord,
    currentItem.category,
    currentItem.emoji,
    currentItem.difficulty,
    appState.targetLanguage,
    appState.nativeLanguage,
    isGuestMode,
  ]);

  const handleNext = () => {
    if (!hasAIVocabulary) {
      return;
    }

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
      const lessonBackpackId = `lesson:${currentItem.id}`;
      const lessonBackpackItem: BackpackItem = {
        id: lessonBackpackId,
        nativeText: currentItem.nativeWord,
        translatedText: currentItem.englishWord,
        source: 'lesson',
        createdAt: new Date().toISOString(),
        difficulty: currentItem.difficulty,
        emoji: currentItem.emoji,
      };
      updateState((prev) => {
        const hasLessonItem = prev.backpackItems.some((item) => item.id === lessonBackpackId);
        const hasLearnedWord = prev.learnedWords.includes(currentItem.id);
        return {
          learnedWords: hasLearnedWord ? prev.learnedWords : [...prev.learnedWords, currentItem.id],
          totalXP: prev.totalXP + 10,
          backpackItems: hasLessonItem
            ? prev.backpackItems
            : [lessonBackpackItem, ...prev.backpackItems],
        };
      });
      setConsecutiveWords((prev) => prev + 1);
    } else {
      updateState((prev) => ({
        totalXP: prev.totalXP + 2,
      }));
      setConsecutiveWords(0);
    }

    // Move to next or go to sentence page
    if (appState.currentVocabIndex < aiVocabulary.length - 1) {
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
      updateState((prev) => ({
        stars: prev.stars + 1,
      }));
    } else if (!premium.isPremium) {
      const nextBatteries = Math.max(0, appState.batteriesRemaining - 1);
      updateState((prev) => ({ batteriesRemaining: Math.max(0, prev.batteriesRemaining - 1) }));

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

  const playAudio = (text: string, lang: string, e?: React.MouseEvent<HTMLElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure language voice based on the clicked word
      utterance.lang = lang;
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

        const preferredVoice = voices.find((voice) => {
          const lang = voice.lang.toLowerCase();
          const target = lang.startsWith('fil') || lang.startsWith('tl') || lang.includes('ph');
          const english = lang.startsWith('en');
          return utterance.lang.startsWith('en') ? english : target;
        });

        const englishFallback = voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
        utterance.voice = robotVoice || preferredVoice || englishFallback || voices[0] || null;
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
        totalProgress={Math.max(aiVocabulary.length, 1)}
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
            {hasAIVocabulary && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-center">
                <span className="inline-flex items-center rounded-full border border-[#56b8e8] bg-[#143244] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#a8dcf6]">
                  Level Pack {levelCycle + 1}
                </span>
                <span className="inline-flex items-center rounded-full border border-[#7ed6ff] bg-[#173b52] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#c9efff]">
                  Theme: {levelTheme}
                </span>
                <span className="inline-flex items-center rounded-full border border-[#FF9126] bg-[#1d3443] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#ffd7aa]">
                  {difficultyLabel} Stage {levelStage}/5
                </span>
              </div>
            )}
          </motion.div>

          {!hasAIVocabulary ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="theme-surface rounded-3xl border p-8 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#FF9126] bg-[#1d3443] text-2xl">
                ⚡
              </div>
              <h2 className="theme-title mt-4 font-baloo text-3xl font-bold">Preparing AI lesson</h2>
              <p className="theme-muted mt-2 text-sm font-semibold">
                The AI vocabulary set is loading now. This starts as soon as the request is ready.
              </p>
            </motion.div>
          ) : isQuizMode ? (
            // Quiz Mode
            <Quiz
              currentWord={displayedItem}
              allWords={currentLevelWords}
              onAnswer={handleQuizAnswer}
              targetLanguage={appState.targetLanguage || 'Hiligaynon'}
              nativeLanguage={appState.nativeLanguage || 'English'}
              useAI={!isGuestMode}
              difficultyBand={currentDifficultyBand}
              levelStage={levelStage}
            />
          ) : (
            // Regular Flashcard Mode
            <>
          <motion.div
            key={displayedItem.id}
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
                    {displayedItem.emoji}
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
                      onClick={(e) => playAudio(displayedItem.nativeWord, 'fil-PH', e)}
                      className="cursor-pointer select-none font-baloo text-6xl font-bold bg-gradient-to-r from-[#FF9126] to-[#FF9126] bg-clip-text text-transparent"
                      title="Tap to hear pronunciation"
                    >
                      {displayedItem.nativeWord}
                    </motion.h2>
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
                    <h3
                      onClick={(e) => playAudio(displayedItem.englishWord, 'en-US', e)}
                      className="theme-title cursor-pointer select-none font-baloo text-5xl font-bold"
                      title="Tap to hear pronunciation"
                    >
                      {displayedItem.englishWord}
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
                      {displayedItem.category}
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
            {aiVocabulary.slice(0, Math.min(10, aiVocabulary.length)).map((item, index) => (
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
            {aiVocabulary.length > 10 && (
              <div className="theme-muted ml-2 self-center text-xs">
                +{aiVocabulary.length - 10} more
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
