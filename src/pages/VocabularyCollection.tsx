import { useState } from 'react';
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
  const [showNoBatteryModal, setShowNoBatteryModal] = useState(false);
  const isGuestMode = (() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const rawUser = window.localStorage.getItem('user');
    if (!rawUser) {
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { name?: string; email?: string };
      const name = (user.name || '').trim().toLowerCase();
      const email = (user.email || '').trim();
      return name === 'guest' || email.length === 0;
    } catch {
      return false;
    }
  })();

  const learnedVocabulary = vocabularyData.filter((item) =>
    appState.learnedWords.includes(item.id)
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] pb-20 text-slate-100">
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={() => navigate('landing')}
        onProfile={() => navigate('profile')}
        title="Your Backpack"
      />

      <div className="mx-auto mt-6 max-w-6xl p-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-8 border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126]">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-bold text-white">Words Learned</h3>
                <ProgressBar
                  current={learnedVocabulary.length}
                  total={vocabularyData.length}
                  color="success"
                />
              </div>
              <div>
                <h3 className="mb-3 text-lg font-bold text-white">Quiz Stars</h3>
                <ProgressBar
                  current={appState.stars}
                  total={vocabularyData.length}
                  color="primary"
                />
              </div>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="mt-6 rounded-2xl border border-[#2a4151] bg-[#122733] p-4 text-center"
            >
              <p className="font-baloo text-2xl font-bold text-[#dff1ff]">
                {learnedVocabulary.length === 0 && 'Start learning to fill your backpack.'}
                {learnedVocabulary.length > 0 &&
                  learnedVocabulary.length < 10 &&
                  'Great start. Keep going.'}
                {learnedVocabulary.length >= 10 &&
                  learnedVocabulary.length < 25 &&
                  'You are making strong progress.'}
                {learnedVocabulary.length >= 25 &&
                  learnedVocabulary.length < 40 &&
                  'You are building a solid vocabulary.'}
                {learnedVocabulary.length >= 40 && 'You have learned a lot already.'}
              </p>
            </motion.div>
          </Card>
        </motion.div>

        {isGuestMode ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="mb-6 flex items-center justify-center text-8xl leading-none">🔐</div>
            <h2 className="mb-4 font-baloo text-3xl font-bold text-[#dff1ff]">Log in to save progress</h2>
            <p className="mb-8 font-semibold text-[#8bb1c7]">
              Your collection and learning progress are only saved for logged-in accounts.
            </p>
            <Button variant="primary" onClick={() => navigate('landing')} icon="👤">
              Go to Log In
            </Button>
          </motion.div>
        ) : learnedVocabulary.length > 0 ? (
          <>
            <h2 className="mb-6 font-baloo text-3xl font-bold text-[#dff1ff]">Your Learned Words</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                      className="mb-3 flex items-center justify-center text-6xl leading-none"
                    >
                      {item.emoji}
                    </motion.div>
                    <h3 className="mb-1 font-baloo text-xl font-bold text-primary">{item.nativeWord}</h3>
                    <p className="text-sm font-semibold text-[#8bb1c7]">{item.englishWord}</p>
                    <button
                      onClick={() => {
                        const utterance = new SpeechSynthesisUtterance(item.nativeWord);
                        speechSynthesis.speak(utterance);
                      }}
                      className="mt-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white transition-transform hover:scale-110"
                    >
                      Play
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
            className="py-20 text-center"
          >
            <div className="mb-6 flex items-center justify-center text-9xl leading-none">🎒</div>
            <h2 className="mb-4 font-baloo text-3xl font-bold text-[#dff1ff]">Your backpack is empty</h2>
            <p className="mb-8 font-semibold text-[#8bb1c7]">Complete lessons to collect words here</p>
            <Button variant="primary" onClick={() => navigate('dashboard')} icon="📚">
              Start Learning
            </Button>
          </motion.div>
        )}

        {!isGuestMode && learnedVocabulary.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-baloo text-3xl font-bold text-[#dff1ff]">More to Learn</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                      <div className="mb-3 flex items-center justify-center text-6xl leading-none grayscale">
                        {item.emoji}
                      </div>
                      <div className="blur-sm">
                        <h3 className="mb-1 font-baloo text-xl font-bold text-[#dff1ff]">???</h3>
                        <p className="text-sm font-semibold text-[#8bb1c7]">{item.englishWord}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-center text-2xl leading-none">🔒</div>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {!isGuestMode && learnedVocabulary.length > 0 && learnedVocabulary.length < vocabularyData.length && (
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

        {!isGuestMode && showNoBatteryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-[#2a4151] bg-[#122733] p-8 text-center shadow-2xl">
              <div className="mb-4 flex items-center justify-center text-7xl leading-none">🔋</div>
              <h3 className="font-baloo text-3xl font-bold text-[#dff1ff]">0 Batteries Left</h3>
              <p className="mt-3 font-semibold text-[#8bb1c7]">
                You can keep reviewing everything you already learned, but new words are locked until you recharge or upgrade to premium.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate('premium')}
                  className="flex-1 rounded-2xl border-b-4 border-[#FF9126] bg-[#FF9126] px-6 py-4 font-bold text-[#184a00] shadow-lg"
                >
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => setShowNoBatteryModal(false)}
                  className="flex-1 rounded-2xl border border-[#2a4151] bg-[#1a3242] px-6 py-4 font-bold text-[#cbe4f6]"
                >
                  Stay Here
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
