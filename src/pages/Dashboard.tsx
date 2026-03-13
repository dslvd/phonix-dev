import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import AISearchBar from '../components/AISearchBar';
import { Page, AppState } from '../App';
import { getBeginnerWords, getIntermediateWords, getAdvancedWords } from '../data/vocabulary';

interface DashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
}

export default function Dashboard({ navigate, appState }: DashboardProps) {
  // Get word counts by difficulty
  const beginnerWords = getBeginnerWords();
  const intermediateWords = getIntermediateWords();
  const advancedWords = getAdvancedWords();
  
  // Progressive level unlocking based on learned words
  const beginnerTotal = beginnerWords.length; // 20 beginner words
  const intermediateTotal = beginnerTotal + intermediateWords.length; // 40 total (20 + 20)

  const beginnerProgress = Math.min(appState.learnedWords.length, beginnerTotal);
  const intermediateProgress = Math.max(0, Math.min(appState.learnedWords.length - beginnerTotal, intermediateWords.length));
  const advancedProgress = Math.max(0, appState.learnedWords.length - intermediateTotal);

  const levels = [
    { 
      name: 'Beginner', 
      icon: '🌱', 
      unlocked: true,
      progress: beginnerProgress,
      total: beginnerTotal,
      description: 'Learn your first words - animals, food, colors',
      color: 'from-green-400 to-emerald-500',
      bgGlow: 'shadow-green-500/50'
    },
    { 
      name: 'Intermediate', 
      icon: '🌿', 
      unlocked: appState.learnedWords.length >= beginnerTotal,
      progress: intermediateProgress,
      total: intermediateWords.length,
      description: 'More vocabulary - body parts and more',
      color: 'from-blue-400 to-cyan-500',
      bgGlow: 'shadow-blue-500/50'
    },
    { 
      name: 'Advanced', 
      icon: '🌳', 
      unlocked: appState.learnedWords.length >= intermediateTotal,
      progress: advancedProgress,
      total: advancedWords.length,
      description: 'Master advanced words - family and more',
      color: 'from-purple-400 to-pink-500',
      bgGlow: 'shadow-purple-500/50'
    },
  ];

  const dailyTasks = [
    { id: 1, text: 'Complete 1 lesson', completed: appState.learnedWords.length > 0 },
    { id: 2, text: 'Review 5 words', completed: appState.learnedWords.length >= 5 },
    { id: 3, text: 'Earn 1 star', completed: appState.stars > 0 },
    { id: 4, text: 'Keep your streak alive', completed: appState.currentStreak > 0 },
  ];

  const totalTasksCompleted = dailyTasks.filter((task) => task.completed).length;

  return (
    <div className="min-h-screen relative overflow-hidden pb-20">
      {/* Animated background with gradient meshes */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.1),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.1),transparent_50%)] -z-10" />
      <NavigationHeader
        onBack={() => navigate('mode')}
        onLogout={() => navigate('landing')}
        onProfile={() => navigate('profile')}
        showStats={true}
        streakCount={appState.currentStreak}
        starCount={appState.stars}
      />

      <div className="max-w-4xl mx-auto p-4 mt-6">
        {/* Welcome Message - Premium */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <h2 className="font-baloo text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Welcome back, Learner! 👋
            </h2>
            <motion.div
              className="absolute -inset-4 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-blue-400/20 blur-2xl -z-10"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-300" />
            <p className="text-gray-600 font-bold text-lg">
              Learning {appState.targetLanguage}
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-300" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 grid gap-4 md:grid-cols-3"
        >
          <Card className="bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-dark">Streak</p>
                <p className="mt-2 font-baloo text-4xl font-bold text-primary">🔥 {appState.currentStreak}</p>
                <p className="text-sm font-semibold text-gray-600">Best: {appState.longestStreak} days</p>
              </div>
              <div className="text-5xl leading-none flex items-center justify-center">🏆</div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-sky-100 to-cyan-100 border-2 border-sky-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-dark">XP earned</p>
                <p className="mt-2 font-baloo text-4xl font-bold text-secondary-dark">{appState.totalXP}</p>
                <p className="text-sm font-semibold text-gray-600">Every lesson adds progress</p>
              </div>
              <div className="text-5xl leading-none flex items-center justify-center">⚡</div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-pink-100 to-orange-100 border-2 border-pink-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500">Daily quests</p>
                <p className="mt-2 font-baloo text-4xl font-bold text-pink-500">{totalTasksCompleted}/{dailyTasks.length}</p>
                <p className="text-sm font-semibold text-gray-600">Quest progress today</p>
              </div>
              <div className="text-5xl leading-none flex items-center justify-center">🎯</div>
            </div>
          </Card>
        </motion.div>

        {/* AI Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <AISearchBar />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Learning Levels - Left Side */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="font-baloo text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Your Learning Path
              </h3>
              <div className="text-3xl">🗺️</div>
            </div>
            {levels.map((level, index) => (
              <motion.div
                key={level.name}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                whileHover={level.unlocked ? { scale: 1.02, y: -4 } : {}}
              >
                <div
                  onClick={level.unlocked ? () => navigate('vocabulary') : undefined}
                  className={`relative group cursor-pointer transition-all duration-300 ${
                    !level.unlocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {/* Glassmorphism Card */}
                  <div className={`
                    relative overflow-hidden rounded-2xl p-6
                    bg-white/70 backdrop-blur-xl
                    border border-white/50
                    shadow-2xl ${level.unlocked ? level.bgGlow + ' shadow-xl' : 'shadow-md'}
                    transition-all duration-300
                  `}>
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${level.color} opacity-10`} />
                    
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {/* Icon with glow */}
                          <div className="relative flex items-center justify-center w-20 h-20">
                            <motion.div
                              animate={level.unlocked ? { 
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0]
                              } : {}}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="text-6xl leading-none flex items-center justify-center"
                            >
                              {level.icon}
                            </motion.div>
                            {level.unlocked && (
                              <motion.div
                                className={`absolute inset-0 bg-gradient-to-r ${level.color} blur-xl opacity-50 -z-10`}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-baloo text-3xl font-bold text-gray-800 mb-1">
                              {level.name}
                            </h4>
                            <p className="text-sm text-gray-600 font-semibold">
                              {level.unlocked ? level.description : '🔒 Complete previous level'}
                            </p>
                          </div>
                        </div>
                        
                        {level.unlocked ? (
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={`text-4xl leading-none flex items-center justify-center bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}
                          >
                            ▶️
                          </motion.div>
                        ) : (
                          <div className="text-4xl opacity-30 leading-none flex items-center justify-center">🔒</div>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-600">Progress</span>
                          <span className="text-xs font-bold text-primary">
                            {level.progress}/{level.total} words
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(level.progress / level.total) * 100}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                            className={`h-full bg-gradient-to-r ${level.color} rounded-full shadow-lg relative overflow-hidden`}
                          >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                          </motion.div>
                        </div>
                        
                        {/* Completion badge */}
                        {level.progress === level.total && level.unlocked && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
                          >
                            ✨ Level Complete!
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Daily Practice */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-orange-100 to-pink-100">
                <h3 className="font-baloo text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📋</span>
                  Daily Practice
                </h3>
                <div className="space-y-3">
                  {dailyTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        task.completed ? 'bg-green-200' : 'bg-white'
                      }`}
                    >
                      <div className="text-2xl leading-none flex items-center justify-center flex-shrink-0">
                        {task.completed ? '✅' : '⬜'}
                      </div>
                      <span className={`font-semibold text-sm ${
                        task.completed ? 'line-through text-gray-600' : 'text-gray-800'
                      }`}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Quiz Challenge */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-purple-100 to-blue-100">
                <h3 className="font-baloo text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🏆</span>
                  Quiz Challenge
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Complete lessons to unlock quizzes!
                </p>
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={appState.learnedWords.length < 5}
                  icon="🎯"
                >
                  Start Quiz
                </Button>
              </Card>
            </motion.div>

            {/* Collection Button */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                variant="success"
                fullWidth
                onClick={() => navigate('collection')}
                icon="🎒"
              >
                View Backpack
              </Button>
            </motion.div>

            {/* Premium Status / Upgrade Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
            >
              {appState.isPremium ? (
                <Card className="bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 border-2 border-yellow-400">
                  <div className="text-center">
                    <div className="text-5xl mb-2 leading-none flex items-center justify-center">💖</div>
                    <h4 className="font-baloo text-lg font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
                      Premium Member
                    </h4>
                    <p className="text-xs text-gray-700 mb-2 font-semibold">
                      Unlimited Hearts Active
                    </p>
                    <div className="bg-white/50 rounded-lg p-2 text-xs space-y-1">
                      <p className="font-bold text-gray-700">∞ Unlimited Hearts</p>
                      <p className="font-bold text-gray-700">📄 Document Translation</p>
                      <p className="font-bold text-gray-700">🔌 Offline Mode</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card 
                  hover
                  className="bg-gradient-to-br from-purple-100 to-pink-200 border-2 border-purple-400 cursor-pointer"
                  onClick={() => navigate('premium')}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2 leading-none flex items-center justify-center">🔋</div>
                    <h4 className="font-baloo text-lg font-bold text-gray-800 mb-2">
                      Upgrade to Premium
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      {appState.heartsRemaining}/5 batteries left
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(appState.heartsRemaining / 5) * 100}%` }}
                      />
                    </div>
                    <Button
                      variant="primary"
                      fullWidth
                    >
                      Get Unlimited Hearts 🚀
                    </Button>
                  </div>
                </Card>
              )}
            </motion.div>

            {/* Switch to Scan Mode */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-orange-100 to-pink-200 border-2 border-primary">
                <div className="text-center">
                  <div className="text-4xl mb-2 leading-none flex items-center justify-center">📸</div>
                  <h4 className="font-baloo text-lg font-bold text-gray-800 mb-2">
                    Try Scan Mode!
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Use your camera to learn words instantly
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('scan')}
                  >
                    Open Camera 📷
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
