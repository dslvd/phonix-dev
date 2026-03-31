import { motion } from 'framer-motion';

interface EnergyBarProps {
  current: number;
  max: number;
  isPremium: boolean;
  onUpgrade?: () => void;
}

export default function EnergyBar({ current, max, isPremium, onUpgrade }: EnergyBarProps) {
  const percentage = isPremium ? 100 : (current / max) * 100;
  const isLow = percentage < 30 && !isPremium;
  const isCritical = percentage < 10 && !isPremium;
  
  const getColor = () => {
    if (isPremium) return 'from-yellow-400 to-amber-500';
    if (isCritical) return 'from-red-500 to-red-600';
    if (isLow) return 'from-orange-400 to-orange-500';
    return 'from-emerald-400 to-teal-500';
  };

  const getGlowColor = () => {
    if (isPremium) return 'shadow-yellow-500/50';
    if (isCritical) return 'shadow-red-500/50';
    if (isLow) return 'shadow-orange-500/50';
    return 'shadow-emerald-500/50';
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.span 
            animate={{ 
              scale: isLow && !isPremium ? [1, 1.2, 1] : 1,
              rotate: isLow && !isPremium ? [0, -10, 10, 0] : 0
            }}
            transition={{ duration: 0.5, repeat: isLow && !isPremium ? Infinity : 0 }}
            className="text-2xl leading-none flex items-center justify-center"
          >
            {isPremium ? '🔋' : isCritical ? '🪫' : isLow ? '🔋' : '🔋'}
          </motion.span>
          <span className="font-bold text-gray-800">
            {isPremium ? 'Unlimited Batteries' : 'Batteries'}
          </span>
        </div>
        
        {!isPremium && (
          <button
            onClick={onUpgrade}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 underline"
          >
            Upgrade →
          </button>
        )}
      </div>

      {/* Energy Bar */}
      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
        </div>
        
        {/* Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${getColor()} relative overflow-hidden`}
        >
          {/* Shine effect */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
          
          {/* Pulse animation when low */}
          {isLow && !isPremium && (
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-white/20"
            />
          )}
        </motion.div>

        {/* Text Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-sm text-gray-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            {isPremium ? '∞ Batteries' : `${current} / ${max} batteries`}
          </span>
        </div>

        {/* Glow effect */}
        {isPremium && (
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute -inset-1 rounded-full ${getGlowColor()} blur-sm -z-10`}
          />
        )}
      </div>

      {/* Warning Messages */}
      {!isPremium && (
        <>
          {isCritical && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-600 font-bold mt-2 text-center"
            >
              ⚠️ Critical! Only {current} batteries left. Upgrade for unlimited batteries!
            </motion.p>
          )}
          {isLow && !isCritical && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-orange-600 font-semibold mt-2 text-center"
            >
              Running low. Consider upgrading to Unlimited Batteries 🔋
            </motion.p>
          )}
          {current === 0 && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-red-700 font-bold mt-2 text-center bg-red-100 p-2 rounded-lg"
            >
              🚫 No batteries remaining! Upgrade to continue without limits.
            </motion.p>
          )}
        </>
      )}

      {/* Premium Badge */}
      {isPremium && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 mt-2"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
             UNLIMITED BATTERIES 
          </div>
        </motion.div>
      )}
    </div>
  );
}
