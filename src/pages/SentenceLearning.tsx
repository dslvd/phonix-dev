import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState, UpdateStateFn } from '../App';
import { sentenceData } from '../data/vocabulary';

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
  const currentSentence = sentenceData[currentIndex];

  const handleNext = () => {
    if (currentIndex < sentenceData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Award completion rewards at the end of sentence practice.
      updateState((prev) => ({ stars: prev.stars + 1, totalXP: prev.totalXP + 8 }));
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
                  {appState.targetLanguage}:
                </p>
                <div className="flex items-center justify-center gap-4">
                  <h2 className="font-baloo text-3xl md:text-4xl font-bold text-[#dff1ff] leading-relaxed">
                    {currentSentence.nativeSentence}
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
                  {appState.nativeLanguage}:
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
