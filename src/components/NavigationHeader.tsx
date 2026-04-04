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
    <div className="sticky top-0 z-50 border-b border-[#1f3544] bg-[#0b1f2b] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Left: Back Button or Logo */}
        <div className="flex items-center gap-3">
          {onBack ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full text-3xl transition-colors hover:bg-[#173346]"
            >
              ⬅️
            </motion.button>
          ) : (
            <h1 className="font-baloo text-2xl font-bold text-[#FF9126]">🦜 Phonix</h1>
          )}
          
          {title && (
            <h2 className="hidden font-baloo text-xl font-bold text-[#d4efff] sm:block">
              {title}
            </h2>
          )}
        </div>

        {/* Center: Progress (if shown) */}
        {showProgress && (
          <div className="hidden items-center gap-2 rounded-full border border-[#2a4151] bg-[#112b3a] px-4 py-2 md:flex">
            <span className="text-sm font-bold text-[#cbe4f6]">
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-3xl leading-none transition-colors hover:bg-[#173346]"
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
              className="rounded-full border border-[#2a4151] bg-[#112b3a] px-4 py-2 text-sm font-bold text-[#cbe4f6] transition-colors hover:bg-[#16384b]"
            >
              Logout
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
