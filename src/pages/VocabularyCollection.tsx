import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import NavigationHeader from '../components/NavigationHeader';
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-green-100 to-blue-100 pb-20">
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={() => navigate('landing')}
        onProfile={() => navigate('profile')}
        title="🎒 Your Backpack"
      />

      <div className="max-w-6xl mx-auto p-4 mt-6">
        {/* Progress Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-8 bg-gradient-to-r from-primary-light to-secondary">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-white mb-3 text-lg">
                  📚 Words Learned
                </h3>
                <ProgressBar
                  current={learnedVocabulary.length}
                  total={vocabularyData.length}
                  color="success"
                />
              </div>
              <div>
                <h3 className="font-bold text-white mb-3 text-lg">
                  ⭐ Quiz Stars
                </h3>
                <ProgressBar
                  current={appState.stars}
                  total={vocabularyData.length}
                  color="primary"
                />
              </div>
            </div>

            {/* Achievement Message */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="text-center mt-6 bg-white rounded-2xl p-4"
            >
              <p className="font-baloo text-2xl font-bold text-gray-800">
                {learnedVocabulary.length === 0 && "Start learning to fill your backpack! 🎒"}
                {learnedVocabulary.length > 0 && learnedVocabulary.length < 10 && "Great start! Keep going! 🌟"}
                {learnedVocabulary.length >= 10 && learnedVocabulary.length < 25 && "You're on fire! 🔥"}
                {learnedVocabulary.length >= 25 && learnedVocabulary.length < 40 && "Superstar learner! ⭐"}
                {learnedVocabulary.length >= 40 && "Incredible! You're a language master! 🏆"}
              </p>
            </motion.div>
          </Card>
        </motion.div>

        {/* Vocabulary Grid */}
        {learnedVocabulary.length > 0 ? (
          <>
            <h2 className="font-baloo text-3xl font-bold text-gray-800 mb-6">
              Your Learned Words 📖
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {learnedVocabulary.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card hover className="text-center">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className="text-6xl mb-3 leading-none flex items-center justify-center"
                    >
                      {item.emoji}
                    </motion.div>
                    <h3 className="font-baloo text-xl font-bold text-primary mb-1">
                      {item.nativeWord}
                    </h3>
                    <p className="text-sm font-semibold text-gray-600">
                      {item.englishWord}
                    </p>
                    <button
                      onClick={() => {
                        const utterance = new SpeechSynthesisUtterance(item.nativeWord);
                        speechSynthesis.speak(utterance);
                      }}
                      className="mt-3 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold hover:scale-110 transition-transform"
                    >
                      🔊 Play
                    </button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-9xl mb-6 leading-none flex items-center justify-center">🎒</div>
            <h2 className="font-baloo text-3xl font-bold text-gray-800 mb-4">
              Your backpack is empty!
            </h2>
            <p className="text-gray-600 font-semibold mb-8">
              Complete lessons to collect words here
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('dashboard')}
              icon="📚"
            >
              Start Learning
            </Button>
          </motion.div>
        )}

        {/* All Available Words */}
        {learnedVocabulary.length > 0 && (
          <div className="mt-12">
            <h2 className="font-baloo text-3xl font-bold text-gray-800 mb-6">
              More to Learn 🎯
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {vocabularyData
                .filter((item) => !appState.learnedWords.includes(item.id))
                .map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="text-center opacity-60">
                      <div className="text-6xl mb-3 grayscale leading-none flex items-center justify-center">
                        {item.emoji}
                      </div>
                      <div className="blur-sm">
                        <h3 className="font-baloo text-xl font-bold text-gray-800 mb-1">
                          ???
                        </h3>
                        <p className="text-sm font-semibold text-gray-600">
                          {item.englishWord}
                        </p>
                      </div>
                      <div className="mt-3 text-2xl leading-none flex items-center justify-center">🔒</div>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {/* Continue Learning Button */}
        {learnedVocabulary.length > 0 && learnedVocabulary.length < vocabularyData.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('vocabulary')}
              icon="🚀"
            >
              Continue Learning
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
