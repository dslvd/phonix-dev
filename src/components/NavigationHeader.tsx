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

  const handleLogout = () => {
    localStorage.removeItem('user');
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="theme-surface-strong sticky top-0 z-50 border-b p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Left: Back Button or Logo */}
        <div className="flex items-center gap-3">
          {onBack ? (
            <motion.button
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="flex items-center justify-center text-3xl leading-none text-[#FF9126] transition-colors hover:text-[#ffb35a]"
            >
              ⬅️
            </motion.button>
          ) : (
            <h1 className="font-baloo text-2xl font-bold text-[#FF9126]">🦜 Phonix</h1>
          )}
          
          {title && (
            <h2 className="theme-title hidden font-baloo text-xl font-bold sm:block">
              {title}
            </h2>
          )}
        </div>

        {/* Center: Progress (if shown) */}
        {showProgress && (
          <div className="theme-nav-button hidden items-center gap-2 rounded-full border px-4 py-2 md:flex">
            <span className="text-sm font-bold">
              {currentProgress} / {totalProgress}
            </span>
          </div>
        )}

        {/* Right: Stats and Logout */}
        <div className="flex items-center gap-3">
          {showStats && !isGuestMode && (
            <>
              <div className="bg-yellow-200 px-3 py-1 rounded-full font-bold text-sm hidden sm:flex items-center gap-1">
                🔥 <span>{streakCount}</span>
              </div>
              <div className="hidden items-center gap-1 rounded-full bg-[#1a6b8d] px-3 py-1 text-sm font-bold text-white sm:flex">
                ⭐ <span>{starCount}</span>
              </div>
            </>
          )}
          
          {onProfile && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onProfile}
              className="flex items-center justify-center text-3xl leading-none text-[#6d3aa8] transition-colors hover:text-[#8a55c6]"
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
              className="theme-nav-button rounded-full border px-4 py-2 text-sm font-bold transition-colors"
            >
              Logout
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
