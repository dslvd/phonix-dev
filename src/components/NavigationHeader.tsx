import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatBatteryCountdown } from "../lib/battery";

interface NavigationHeaderProps {
  onBack?: () => void;
  onMenu?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
  title?: string;
  showProgress?: boolean;
  currentProgress?: number;
  totalProgress?: number;
  batteryCurrent?: number;
  batteryMax?: number;
  batteryResetAt?: string | null;
  isPremium?: boolean;
  showStats?: boolean;
  streakCount?: number;
  starCount?: number;
}

export default function NavigationHeader({
  onBack,
  onMenu,
  onLogout: _onLogout,
  onProfile,
  title,
  showProgress = false,
  currentProgress = 0,
  totalProgress = 0,
  batteryCurrent,
  batteryMax,
  batteryResetAt,
  isPremium = false,
  showStats = true,
  streakCount = 0,
  starCount = 0,
}: NavigationHeaderProps) {
  const [now, setNow] = useState(() => Date.now());

  const storedStats = (() => {
    if (typeof window === "undefined") {
      return { streakCount: 0, starCount: 0 };
    }

    const rawState = window.localStorage.getItem("phonix-app-state");
    if (!rawState) {
      return { streakCount: 0, starCount: 0 };
    }

    try {
      const state = JSON.parse(rawState) as { currentStreak?: number; stars?: number };
      return {
        streakCount: typeof state.currentStreak === "number" ? state.currentStreak : 0,
        starCount: typeof state.stars === "number" ? state.stars : 0,
      };
    } catch {
      return { streakCount: 0, starCount: 0 };
    }
  })();

  const displayStreakCount = streakCount || storedStats.streakCount;
  const displayStarCount = starCount || storedStats.starCount;

  useEffect(() => {
    if (typeof batteryResetAt !== "string" || isPremium) {
      return;
    }

    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, [batteryResetAt, isPremium]);

  return (
    <>
      <div aria-hidden="true" className="h-[73px] md:hidden" />


      <div className="fixed inset-x-0 top-0 z-50 px-4 pt-3 md:static">
        <div className="theme-bg-surface w-full border rounded-2xl">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
            {/* ...all your content stays the same... */}
            <div className="flex min-w-0 items-center gap-2.5">
              {onMenu && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onMenu}
                  className="theme-bg-surface flex h-10 w-10 items-center justify-center rounded-xl border text-xl leading-none transition md:hidden"
                  aria-label="Open navigation menu"
                >
                  ☰
                </motion.button>
              )}

              {onBack ? (
                <motion.button
                  whileHover={{ scale: 1.03, x: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className={`theme-bg-surface h-10 w-10 items-center justify-center rounded-xl border text-xl leading-none transition ${
                    onMenu ? "hidden md:flex" : "flex"
                  }`}
                  aria-label="Go back"
                >
                  ←
                </motion.button>
              ) : (
                <h1 className="font-baloo text-2xl font-bold text-[#FF9126]">Phonix</h1>
              )}

              {title && <h2 className="truncate font-baloo text-lg font-bold sm:text-xl">{title}</h2>}
            </div>

            {showProgress && (
              <div className="theme-bg-surface hidden items-center rounded-full border px-3 py-1.5 md:flex">
                <span className="theme-text-soft mr-2 text-[11px] font-bold uppercase tracking-[0.08em]">
                  Progress
                </span>
                <span className="text-sm font-bold">
                  {currentProgress} / {totalProgress}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {typeof batteryCurrent === "number" && typeof batteryMax === "number" && (
                <div className="theme-bg-surface flex items-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-bold">
                  <span>{isPremium ? "🔋" : batteryCurrent <= 0 ? "🪫" : "🔋"}</span>
                  <span>
                    {isPremium
                      ? "∞"
                      : batteryResetAt && batteryCurrent < batteryMax
                        ? `${batteryCurrent}/${batteryMax} · ${formatBatteryCountdown(batteryResetAt, now)}`
                        : `${batteryCurrent}/${batteryMax}`}
                  </span>
                </div>
              )}



              {showStats && (
                <>
                  <div className="theme-bg-surface flex items-center gap-1 rounded-full border px-2.5 py-2.5 text-xs font-bold">
                  <span>🔥</span>
                  <span>{displayStreakCount}</span>
                  </div>
                  <div className="theme-bg-surface flex items-center gap-1 rounded-full border px-2.5 py-2.5 text-xs font-bold">
                    <span>⭐</span>
                    <span>{displayStarCount}</span>
                  </div>
                </>
              )}

              {onProfile && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onProfile}
                  className="theme-bg-surface flex h-10 w-10 items-center justify-center rounded-xl border text-lg leading-none transition-colors hover:text-[#2f9de4]"
                  title="Profile"
                  aria-label="Open profile"
                >
                  👤
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
