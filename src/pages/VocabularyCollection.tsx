import { motion } from 'framer-motion';
import Button from '../components/Button';
import SimplePageLayout from '../components/SimplePageLayout';
import { Page, AppState } from '../App';
import { vocabularyData } from '../data/vocabulary';

interface VocabularyCollectionProps {
  navigate: (page: Page) => void;
  appState: AppState;
}

export default function VocabularyCollection({
  navigate,
  appState,
}: VocabularyCollectionProps) {
  const learnedVocabulary = vocabularyData.filter((item) =>
    appState.learnedWords.includes(item.id)
  );

  const messageText = 
    learnedVocabulary.length === 0 ? "🎒 Your backpack is empty!" :
    learnedVocabulary.length < 10 ? "🌟 Great start! Keep going!" :
    learnedVocabulary.length < 25 ? "🔥 You're on fire!" :
    learnedVocabulary.length < 40 ? "⭐ Superstar learner!" :
    "🏆 Language master!";

  return (
    <SimplePageLayout
      title="Your Backpack"
      subtitle={`${learnedVocabulary.length}/${vocabularyData.length} words learned`}
      showHeader={true}
      onBack={() => navigate('dashboard')}
      onLogout={() => navigate('landing')}
      onProfile={() => navigate('profile')}
      className="space-y-8"
    >
      {/* Achievement Message */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center py-6"
      >
        <h2 className="font-baloo text-3xl font-bold text-gray-800">
          {messageText}
        </h2>
      </motion.div>

      {/* Learning Status */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-700">Words Mastered</span>
          <span className="font-bold text-primary">{learnedVocabulary.length}/{vocabularyData.length}</span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(learnedVocabulary.length / vocabularyData.length) * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
          />
        </div>
      </div>

      {/* Vocabulary Grid */}
      {learnedVocabulary.length > 0 ? (
        <>
          <div>
            <h3 className="font-baloo font-bold text-lg text-gray-800 mb-4">
              Your Learned Words 📖
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {learnedVocabulary.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const utterance = new SpeechSynthesisUtterance(item.nativeWord);
                    utterance.lang = 'fil-PH';
                    speechSynthesis.speak(utterance);
                  }}
                  className="flex flex-col items-center gap-2 p-3 border-2 border-gray-300 rounded-2xl hover:border-sky-400 hover:bg-sky-50 transition-all"
                >
                  <span className="text-3xl leading-none">{item.emoji}</span>
                  <span className="text-xs font-bold text-gray-700">{item.nativeWord}</span>
                  <span className="text-2xl leading-none">🔊</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          {learnedVocabulary.length < vocabularyData.length && (
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('vocabulary')}
            >
              Learn More Words 🚀
            </Button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 font-semibold">
            Complete lessons to collect words in your backpack!
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('dashboard')}
            className="mt-4"
          >
            Start Learning
          </Button>
        </div>
      )}
    </SimplePageLayout>
  );
}
