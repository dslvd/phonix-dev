import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState, UpdateStateFn } from '../App';
import { sentenceData, vocabularyData } from '../data/vocabulary';

interface SentenceLearningProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: UpdateStateFn;
}

export default function SentenceLearning({
  navigate,
  appState,
  updateState,
}: SentenceLearningProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const currentSentence = sentenceData[currentIndex];

  const question = useMemo(() => {
    const stopWords = new Set(['ang', 'sang', 'ako', 'si', 'sa', 'ni', 'kay', 'nga']);
    const words = currentSentence.nativeSentence.split(/\s+/);
    const cleanWords = words.map((word) => word.replace(/[^A-Za-zÀ-ÿ'-]/g, '').toLowerCase());

    const candidateIndexes = cleanWords
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => word.length > 2 && !stopWords.has(word))
      .map(({ index }) => index);

    const blankIndex = candidateIndexes.length > 0 ? candidateIndexes[0] : Math.max(0, words.length - 1);
    const correctWord = words[blankIndex].replace(/[^A-Za-zÀ-ÿ'-]/g, '');

    const distractors = vocabularyData
      .map((item) => item.nativeWord)
      .filter((word) => word.toLowerCase() !== correctWord.toLowerCase())
      .slice(currentIndex, currentIndex + 30)
      .filter((word, index, array) => array.findIndex((entry) => entry.toLowerCase() === word.toLowerCase()) === index)
      .slice(0, 3);

    while (distractors.length < 3) {
      const fallback = vocabularyData[(distractors.length + currentIndex) % vocabularyData.length]?.nativeWord || 'Pulong';
      if (fallback.toLowerCase() !== correctWord.toLowerCase()) {
        distractors.push(fallback);
      }
    }

    const options = [correctWord, ...distractors].sort((a, b) => {
      const seed = (currentSentence.id + a + b).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return seed % 3 === 0 ? -1 : 1;
    });

    const maskedWords = [...words];
    maskedWords[blankIndex] = '_____';

    return {
      maskedSentence: maskedWords.join(' '),
      correctWord,
      options,
    };
  }, [currentSentence, currentIndex]);

  const handleNext = () => {
    if (!showResult) {
      return;
    }

    if (currentIndex < sentenceData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Award completion rewards at the end of sentence practice.
      updateState((prev) => ({ stars: prev.stars + 1, totalXP: prev.totalXP + 8 }));
      navigate('collection');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setShowResult(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showResult) {
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(option);
      utterance.lang = 'fil-PH';
      utterance.rate = 0.85;
      utterance.pitch = 0.75;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    const isCorrect = option.toLowerCase() === question.correctWord.toLowerCase();
    setSelectedOption(option);
    setShowResult(true);

    updateState((prev) => ({
      totalXP: prev.totalXP + (isCorrect ? 6 : 2),
      stars: prev.stars + (isCorrect ? 1 : 0),
    }));
  };

  const playAudio = (text: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure for Hiligaynon/Filipino pronunciation
      utterance.lang = 'fil-PH'; // Filipino language code
      utterance.rate = 0.8;
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
    }
  };

  return (
    <div className="theme-page min-h-screen flex flex-col text-slate-100">
      <NavigationHeader
        onBack={() => navigate('vocabulary')}
        onLogout={() => navigate('landing')}
        title="Sentence Practice"
        showProgress={true}
        currentProgress={currentIndex + 1}
        totalProgress={sentenceData.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <motion.div
            key={currentSentence.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 150 }}
          >
            <Card className="text-center">
              {/* Illustration */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-9xl mb-8 leading-none flex items-center justify-center"
              >
                {currentSentence.illustration}
              </motion.div>

              {/* Native Sentence */}
              <div className="mb-8 rounded-2xl border border-[#304656] bg-[#122733] p-6">
                <p className="mb-3 text-sm font-bold text-[#8bb1c7]">
                  {appState.targetLanguage} Fill in the blank:
                </p>
                <div className="flex items-center justify-center gap-4">
                  <h2 className="font-baloo text-3xl md:text-4xl font-bold text-[#dff1ff] leading-relaxed">
                    {question.maskedSentence}
                  </h2>
                  <button
                    onClick={(e) => playAudio(currentSentence.nativeSentence, e)}
                    className="bg-primary text-white p-4 rounded-full hover:scale-110 transition-transform flex-shrink-0"
                  >
                    🔊
                  </button>
                </div>
              </div>

              {/* English Translation */}
              <div className="rounded-2xl border border-[#304656] bg-[#0f202a] p-6 shadow-lg">
                <p className="mb-3 text-sm font-bold text-[#8bb1c7]">
                  {appState.nativeLanguage} Hint:
                </p>
                <div className="flex items-center justify-center gap-4">
                  <h3 className="font-baloo text-3xl md:text-4xl font-bold text-secondary leading-relaxed">
                    {currentSentence.englishSentence}
                  </h3>
                  <button
                    onClick={(e) => playAudio(currentSentence.englishSentence, e)}
                    className="bg-secondary text-white p-4 rounded-full hover:scale-110 transition-transform flex-shrink-0"
                  >
                    🔊
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {question.options.map((option) => {
                  const isCorrectOption = option.toLowerCase() === question.correctWord.toLowerCase();
                  const isSelected = selectedOption?.toLowerCase() === option.toLowerCase();

                  const stateClass = !showResult
                    ? 'theme-nav-button hover:border-[#FF9126]'
                    : isCorrectOption
                    ? 'border border-green-500 bg-green-100 text-green-900'
                    : isSelected
                    ? 'border border-red-500 bg-red-100 text-red-900'
                    : 'theme-nav-button opacity-70';

                  return (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(option)}
                      disabled={showResult}
                      className={`rounded-xl px-4 py-3 text-lg font-bold transition ${stateClass}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div className="mt-4 rounded-xl border border-[#304656] bg-[#173447] p-4">
                  <p className="theme-title text-lg font-bold">
                    {selectedOption?.toLowerCase() === question.correctWord.toLowerCase() ? 'Correct! Great job!' : 'Nice try!'}
                  </p>
                  <p className="theme-muted mt-1 font-semibold">
                    Correct answer: {question.correctWord}
                  </p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              ← Previous
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!showResult}
              className="flex-1"
            >
              {currentIndex === sentenceData.length - 1 ? 'Finish! 🎉' : 'Next →'}
            </Button>
          </div>

          {/* Progress Dots */}
          <div className="mt-4 flex justify-center gap-2">
            {sentenceData.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-secondary w-6'
                    : index < currentIndex
                    ? 'bg-success'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
