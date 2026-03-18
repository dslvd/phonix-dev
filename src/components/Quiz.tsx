import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabularyItem } from '../data/vocabulary';

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
    if (showResult) return;
    
    setSelectedAnswer(wordId);
    setShowResult(true);
    
    const isCorrect = wordId === currentWord.id;
    
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-block px-3 py-1 bg-yellow-600 rounded-full mb-2">
          <span className="text-white font-bold text-xs flex items-center gap-2 leading-none">
            🎯 Quiz Challenge
          </span>
        </div>
        <h3 className="font-bold text-sm text-gray-300">
          What is this word?
        </h3>
      </div>

      {/* Word Display */}
      <div className="bg-gray-700 rounded-lg p-4 text-center mb-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-5xl mb-2 leading-none flex items-center justify-center"
        >
          {currentWord.emoji}
        </motion.div>
        <p className="font-bold text-white text-sm">
          {currentWord.englishWord}
        </p>
      </div>

      {/* Multiple Choice - Minimal Buttons */}
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {options.map((word, index) => (
            <motion.button
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelect(word.id)}
              disabled={showResult}
              className={`w-full p-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center gap-2 ${
                !showResult 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : word.id === currentWord.id
                  ? 'bg-green-700 text-white'
                  : word.id === selectedAnswer
                  ? 'bg-red-700 text-white'
                  : 'bg-gray-700 text-gray-500 opacity-50'
              }`}
            >
              <span className="text-2xl leading-none">{word.emoji}</span>
              <div className="text-left flex-1">
                <p className="font-bold text-sm">{word.nativeWord}</p>
                <p className="text-xs opacity-75">{word.englishWord}</p>
              </div>
              {showResult && word.id === currentWord.id && (
                <span className="text-lg leading-none">✅</span>
              )}
              {showResult && word.id === selectedAnswer && word.id !== currentWord.id && (
                <span className="text-lg leading-none">❌</span>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Result Message */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-lg text-center text-sm font-bold ${
              selectedAnswer === currentWord.id 
                ? 'bg-green-700 text-white'
                : 'bg-red-700 text-white'
            }`}
          >
            {selectedAnswer === currentWord.id ? (
              <span>🎉 Correct!</span>
            ) : (
              <span>💪 Try again!</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
