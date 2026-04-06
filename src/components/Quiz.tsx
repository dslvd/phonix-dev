import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabularyItem } from '../data/vocabulary';
import Card from './Card';

interface QuizProps {
  currentWord: VocabularyItem;
  allWords: VocabularyItem[];
  onAnswer: (correct: boolean) => void;
  targetLanguage?: string;
  nativeLanguage?: string;
  useAI?: boolean;
  difficultyBand?: 'beginner' | 'intermediate' | 'advanced';
  levelStage?: number;
}

interface AIQuizPayload {
  question?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
  options?: Array<{
    nativeWord?: string;
    englishWord?: string;
    emoji?: string;
    isCorrect?: boolean;
  }>;
}

const aiQuizCache = new Map<string, AIQuizPayload>();

const stripCodeFence = (text: string) => text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

const parseAIQuizPayload = (rawText: string): AIQuizPayload | null => {
  const cleaned = stripCodeFence(rawText);

  try {
    return JSON.parse(cleaned) as AIQuizPayload;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as AIQuizPayload;
    } catch {
      return null;
    }
  }
};

export default function Quiz({
  currentWord,
  allWords,
  onAnswer,
  targetLanguage = 'Hiligaynon',
  nativeLanguage = 'English',
  useAI = true,
  difficultyBand,
  levelStage = 1,
}: QuizProps) {
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [challengeText, setChallengeText] = useState('');
  const [correctText, setCorrectText] = useState('');
  const [incorrectText, setIncorrectText] = useState('');

  const challengeLines = [
    'What is this in Hiligaynon?',
    'Which Hiligaynon word matches this?',
    'Pick the correct Hiligaynon answer.',
    'Can you identify the right word?',
  ];
  const correctLines = [
    'Correct! Great job!',
    'Nice one! You got it right.',
    'Well done! That is correct.',
    'Great answer! Keep going.',
  ];
  const incorrectLines = [
    'Not quite! Keep practicing!',
    'Almost. Try the next one.',
    'Good try. Let us keep practicing.',
    'Close. You will get the next one.',
  ];

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);

    const fallbackChallenge = challengeLines[currentWord.englishWord.length % challengeLines.length];
    const fallbackCorrect = correctLines[currentWord.nativeWord.length % correctLines.length];
    const fallbackIncorrect = incorrectLines[currentWord.id.length % incorrectLines.length];

    setChallengeText(fallbackChallenge);
    setCorrectText(fallbackCorrect);
    setIncorrectText(fallbackIncorrect);

    const setLocalOptions = () => {
      const wrongOptions = allWords
        .filter((word) => word.id !== currentWord.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const localOptions = [currentWord, ...wrongOptions].sort(() => Math.random() - 0.5);
      setOptions(localOptions);
    };

    const applyAIOptions = (payload: AIQuizPayload) => {
      if (!payload?.options || payload.options.length !== 4) {
        return false;
      }

      const normalized = payload.options.map((option, index) => {
        const nativeWord = (option.nativeWord || '').trim();
        const isCorrect = !!option.isCorrect || nativeWord.toLowerCase() === currentWord.nativeWord.toLowerCase();

        return {
          id: isCorrect ? currentWord.id : `ai-${currentWord.id}-${index}`,
          nativeWord: isCorrect ? currentWord.nativeWord : nativeWord,
          englishWord: (option.englishWord || currentWord.englishWord).trim() || currentWord.englishWord,
          category: currentWord.category,
          emoji: (option.emoji || currentWord.emoji).trim() || currentWord.emoji,
          difficulty: currentWord.difficulty,
        } satisfies VocabularyItem;
      });

      const uniqueNativeWords = new Set(normalized.map((item) => item.nativeWord.toLowerCase()));
      const correctCount = normalized.filter((item) => item.id === currentWord.id).length;

      if (uniqueNativeWords.size < 4 || correctCount !== 1) {
        return false;
      }

      setOptions(normalized.sort(() => Math.random() - 0.5));
      if (payload.question?.trim()) {
        setChallengeText(payload.question.trim());
      }
      if (payload.correctFeedback?.trim()) {
        setCorrectText(payload.correctFeedback.trim());
      }
      if (payload.incorrectFeedback?.trim()) {
        setIncorrectText(payload.incorrectFeedback.trim());
      }

      return true;
    };

    let cancelled = false;

    // Always render quiz options immediately so users can answer without waiting for AI.
    setLocalOptions();

    const quizCacheKey = [
      currentWord.id,
      targetLanguage,
      nativeLanguage,
      difficultyBand || currentWord.difficulty,
      Math.max(1, Math.min(5, levelStage)),
    ].join('|');

    const cachedPayload = aiQuizCache.get(quizCacheKey);
    if (cachedPayload) {
      applyAIOptions(cachedPayload);
    }

    const buildAIQuiz = async () => {
      if (!useAI) {
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      try {
        const stageHint =
          levelStage <= 1
            ? 'Stage 1: easier distractors are allowed.'
            : levelStage === 2
            ? 'Stage 2: use moderately similar distractors.'
            : levelStage === 3
            ? 'Stage 3: distractors should be close in category and meaning.'
            : levelStage === 4
            ? 'Stage 4: distractors should be very close and tricky.'
            : 'Stage 5: use highly confusable distractors with similar form and meaning.';

        const prompt = [
          'You are generating one multiple-choice language-learning quiz item.',
          `Difficulty level: ${currentWord.difficulty}.`,
          `Difficulty band: ${difficultyBand || currentWord.difficulty}.`,
          `Current stage: ${Math.max(1, Math.min(5, levelStage))} of 5.`,
          `Target language: ${targetLanguage}.`,
          `Learner native language: ${nativeLanguage}.`,
          `Correct answer in ${targetLanguage}: ${currentWord.nativeWord}.`,
          `Reference English word: ${currentWord.englishWord}.`,
          stageHint,
          '',
          'Return STRICT JSON only with this shape:',
          '{',
          '  "question": "string",',
          '  "correctFeedback": "string",',
          '  "incorrectFeedback": "string",',
          '  "options": [',
          '    { "nativeWord": "string", "englishWord": "string", "emoji": "string", "isCorrect": true|false }',
          '  ]',
          '}',
          '',
          'Rules:',
          '1. Provide exactly 4 options.',
          '2. Exactly one option must have isCorrect=true and it must be the same word as the correct answer.',
          '3. Wrong options must be plausible but clearly different from the correct answer.',
          '4. Keep all text concise and learner-friendly.',
        ].join('\n');

        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('ai-quiz-request-failed');
        }

        const data = await response.json();
        const payload = parseAIQuizPayload(String(data?.text || ''));

        if (!payload) {
          throw new Error('ai-quiz-invalid-options');
        }

        aiQuizCache.set(quizCacheKey, payload);

        if (!cancelled) {
          const applied = applyAIOptions(payload);
          if (!applied) {
            throw new Error('ai-quiz-invalid-uniqueness');
          }
        }
      } catch {
        // Keep instant local options when AI quiz generation is unavailable.
      }
    };

    buildAIQuiz();

    return () => {
      cancelled = true;
    };
  }, [currentWord.id, currentWord.nativeWord, currentWord.englishWord, currentWord.category, currentWord.difficulty, currentWord.emoji, targetLanguage, nativeLanguage, allWords, useAI, difficultyBand, levelStage]);

  const handleSelect = (wordId: string) => {
    if (showResult) return; // Prevent multiple selections

    const selectedWord = options.find((option) => option.id === wordId);
    if (selectedWord && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(selectedWord.nativeWord);
      utterance.lang = 'fil-PH';
      utterance.rate = 0.85;
      utterance.pitch = 0.75;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    
    setSelectedAnswer(wordId);
    setShowResult(true);
    
    const isCorrect = wordId === currentWord.id;
    
    // Delay to show result before moving to next
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1500);
  };

  const getButtonStyle = (word: VocabularyItem) => {
    if (!showResult) {
      return 'theme-surface-soft border-2 border-[color:var(--theme-border)] hover:border-[#FF9126] hover:shadow-lg';
    }
    
    if (word.id === currentWord.id) {
      return 'theme-quiz-correct border-2';
    }
    
    if (word.id === selectedAnswer && word.id !== currentWord.id) {
      return 'border-2 border-red-500 bg-gradient-to-r from-red-100 to-rose-100 shadow-lg shadow-red-500/30';
    }
    
    return 'theme-surface-soft border-2 border-[color:var(--theme-border)] opacity-60';
  };

  return (
    <div className="space-y-8">
      {/* Challenge Header */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="inline-block px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg">
          <span className="font-baloo text-white font-bold text-lg flex items-center gap-2 leading-none">
            <span className="text-2xl leading-none flex items-center justify-center">🎯</span>
            Quiz Challenge!
          </span>
        </div>
        <h3 className="theme-title mb-2 font-baloo text-2xl font-bold">
          {challengeText}
        </h3>
      </motion.div>

      {/* Word Display */}
      <Card className="theme-surface-soft border-2 border-[color:var(--theme-border)] text-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[120px] mb-4 leading-none flex items-center justify-center"
        >
          {currentWord.emoji}
        </motion.div>
        <h2 className="theme-title font-baloo text-4xl font-bold">
          {currentWord.englishWord}
        </h2>
      </Card>

      {/* Multiple Choice Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="wait">
          {options.map((word, index) => (
            <motion.button
              key={word.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(word.id)}
              disabled={showResult}
              className={`${getButtonStyle(word)} rounded-2xl p-6 transition-all duration-300 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-4">
                <div className="text-left flex-1">
                  <p className="theme-title font-baloo text-2xl font-bold">
                    {word.nativeWord}
                  </p>
                </div>
                {showResult && word.id === currentWord.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-3xl leading-none flex items-center justify-center"
                  >
                    ✅
                  </motion.div>
                )}
                {showResult && word.id === selectedAnswer && word.id !== currentWord.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-3xl leading-none flex items-center justify-center"
                  >
                    ❌
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Result Message */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            {selectedAnswer === currentWord.id ? (
              <Card className="theme-quiz-correct border-2 py-6">
                <div className="text-6xl mb-2 leading-none flex items-center justify-center">🎉</div>
                <p className="font-baloo text-2xl font-bold">
                  {correctText}
                </p>
              </Card>
            ) : (
              <Card className="border-2 border-red-400 bg-gradient-to-r from-red-100 to-rose-100 py-6">
                <div className="text-6xl mb-2 leading-none flex items-center justify-center">💪</div>
                <p className="font-baloo text-2xl font-bold text-red-700">
                  {incorrectText}
                </p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
