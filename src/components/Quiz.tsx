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
  }, [currentWord, allWords]);

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
      return 'bg-white/90 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400';
    }
    
    if (word.id === currentWord.id) {
      return 'bg-green-100 border-2 border-green-500 shadow-lg shadow-green-500/50';
    }
    
    if (word.id === selectedAnswer && word.id !== currentWord.id) {
      return 'bg-red-100 border-2 border-red-500 shadow-lg shadow-red-500/50';
    }
    
    return 'bg-white/50 border-2 border-gray-300 opacity-60';
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
        <h3 className="font-baloo text-2xl font-bold text-gray-800 mb-2">
          What is this in Hiligaynon?
        </h3>
      </motion.div>

      {/* Word Display */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 text-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[120px] mb-4 leading-none flex items-center justify-center"
        >
          {currentWord.emoji}
        </motion.div>
        <h2 className="font-baloo text-4xl font-bold text-gray-800">
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
                  <p className="font-baloo text-2xl font-bold text-gray-800">
                    {word.nativeWord}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
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
              <Card className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 py-6">
                <div className="text-6xl mb-2 leading-none flex items-center justify-center">🎉</div>
                <p className="font-baloo text-2xl font-bold text-green-700">
                  Correct! Great job!
                </p>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-400 py-6">
                <div className="text-6xl mb-2 leading-none flex items-center justify-center">💪</div>
                <p className="font-baloo text-2xl font-bold text-red-700">
                  Not quite! Keep practicing!
                </p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
