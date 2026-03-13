import { motion } from 'framer-motion';

interface NavigationHeaderProps {
  onBack?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
  title?: string;
  showProgress?: boolean;
  currentProgress?: number;
  totalProgress?: number;
  showStats?: boolean;
  streakCount?: number;
  starCount?: number;
}

export default function NavigationHeader({
  onBack,
  onLogout,
  onProfile,
  title,
  showProgress = false,
  currentProgress = 0,
  totalProgress = 0,
  showStats = false,
  streakCount = 0,
  starCount = 0,
}: NavigationHeaderProps) {
  const handleLogout = () => {
    localStorage.removeItem('user');
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="bg-white shadow-lg p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Left: Back Button or Logo */}
        <div className="flex items-center gap-3">
          {onBack ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="text-3xl hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ⬅️
            </motion.button>
          ) : (
            <h1 className="font-baloo text-2xl font-bold text-primary">🦜 Phonix</h1>
          )}
          
          {title && (
            <h2 className="font-baloo text-xl font-bold text-gray-800 hidden sm:block">
              {title}
            </h2>
          )}
        </div>

        {/* Center: Progress (if shown) */}
        {showProgress && (
          <div className="hidden md:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            <span className="font-bold text-sm text-gray-700">
              {currentProgress} / {totalProgress}
            </span>
          </div>
        )}

        {/* Right: Stats and Logout */}
        <div className="flex items-center gap-3">
          {showStats && (
            <>
              <div className="bg-yellow-200 px-3 py-1 rounded-full font-bold text-sm hidden sm:flex items-center gap-1">
                🔥 <span>{streakCount}</span>
              </div>
              <div className="bg-sky-200 px-3 py-1 rounded-full font-bold text-sm hidden sm:flex items-center gap-1">
                ⭐ <span>{starCount}</span>
              </div>
            </>
          )}
          
          {onProfile && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onProfile}
              className="text-3xl hover:bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors leading-none"
              title="Profile"
            >
              👤
            </motion.button>
          )}
          
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-600 transition-colors"
            >
              Logout
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
