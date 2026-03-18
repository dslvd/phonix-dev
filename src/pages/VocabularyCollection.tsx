import { motion } from 'framer-motion';
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
      {/* Learning Status */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-gray-300">Progress</span>
          <span className="font-bold text-white">{learnedVocabulary.length}/{vocabularyData.length}</span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(learnedVocabulary.length / vocabularyData.length) * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-blue-600 rounded-full"
          />
        </div>
      </div>

      {/* Vocabulary Buttons Grid */}
      {learnedVocabulary.length > 0 ? (
        <>
          <div>
            <h3 className="font-bold text-gray-300 text-sm mb-3">Learned Words</h3>
            <div className="grid grid-cols-4 gap-2">
              {learnedVocabulary.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const utterance = new SpeechSynthesisUtterance(item.nativeWord);
                    utterance.lang = 'fil-PH';
                    speechSynthesis.speak(utterance);
                  }}
                  className="flex flex-col items-center gap-1 p-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-all"
                >
                  <span className="text-xl leading-none">{item.emoji}</span>
                  <span className="text-xs font-bold text-gray-300 text-center">{item.nativeWord}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          {learnedVocabulary.length < vocabularyData.length && (
            <button
              onClick={() => navigate('vocabulary')}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all"
            >
              Learn More
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">Complete lessons to collect words</p>
          <button
            onClick={() => navigate('dashboard')}
            className="mt-4 py-2 px-4 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all"
          >
            Start Learning
          </button>
        </div>
      )}
    </SimplePageLayout>
  );
}
