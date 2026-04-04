import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabularyItem } from '../data/vocabulary';
import Card from './Card';

interface QuizProps {
  currentWord: VocabularyItem;
  allWords: VocabularyItem[];
  onAnswer: (correct: boolean) => void;
}

export default function Quiz({ currentWord, allWords, onAnswer }: QuizProps) {
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
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
  const challengeText = challengeLines[currentWord.englishWord.length % challengeLines.length];
  const correctText = correctLines[currentWord.nativeWord.length % correctLines.length];
  const incorrectText = incorrectLines[currentWord.id.length % incorrectLines.length];

  useEffect(() => {
    // Generate 4 multiple choice options (1 correct + 3 wrong)
    const wrongOptions = allWords
      .filter(word => word.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [currentWord, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setShowResult(false);
  }, [currentWord.id]);

  const handleSelect = (wordId: string) => {
    if (showResult) return; // Prevent multiple selections
    
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
                <div className="text-5xl leading-none flex items-center justify-center flex-shrink-0">
                  {word.emoji}
                </div>
                <div className="text-left flex-1">
                  <p className="theme-title font-baloo text-2xl font-bold">
                    {word.nativeWord}
                  </p>
                  <p className="theme-muted mt-1 text-sm">
                    {word.englishWord}
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
