import { useState } from 'react';
import { motion } from 'framer-motion';
import Mascot from '../components/Mascot';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState } from '../App';
import { sentenceData } from '../data/vocabulary';

interface SentenceLearningProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export default function SentenceLearning({
  navigate,
  appState,
  updateState,
}: SentenceLearningProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSentence = sentenceData[currentIndex];

  const handleNext = () => {
    if (currentIndex < sentenceData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Award a star for completing
      updateState({ stars: appState.stars + 1 });
      navigate('collection');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
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
            className="bg-gray-800 rounded-2xl p-6 shadow-2xl"
          >
            {/* Illustration */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-6xl mb-6 text-center leading-none flex items-center justify-center"
            >
              {currentSentence.illustration}
            </motion.div>

            {/* Native Sentence */}
            <div className="mb-4 bg-gray-700 rounded-lg p-4">
              <p className="text-xs font-bold text-gray-400 mb-2">
                {appState.targetLanguage}
              </p>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">
                  {currentSentence.nativeSentence}
                </h2>
                <button
                  onClick={(e) => playAudio(currentSentence.nativeSentence, e)}
                  className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all"
                >
                  🔊
                </button>
              </div>
            </div>

            {/* English Translation */}
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-xs font-bold text-gray-400 mb-2">
                {appState.nativeLanguage}
              </p>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-white">
                  {currentSentence.englishSentence}
                </h3>
                <button
                  onClick={(e) => playAudio(currentSentence.englishSentence, e)}
                  className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all"
                >
                  🔊
                </button>
              </div>
            </div>
          </motion.div>

          {/* Navigation Buttons - Small */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                currentIndex === 0
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
              {currentIndex === sentenceData.length - 1 ? 'Done!' : 'Next →'}
            </button>
          </div>

          {/* Progress Dots */}
          <div className="mt-4 flex justify-center gap-1">
            {sentenceData.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-blue-600 w-4'
                    : index < currentIndex
                    ? 'bg-green-600'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mascot */}
      <Mascot
        message="You're doing amazing! Keep it up! 💪"
        animation="wiggle"
      />
    </div>
  );
}
