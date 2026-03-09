import { motion } from 'framer-motion';

interface MascotProps {
  message?: string;
  position?: 'bottom' | 'center';
  animation?: 'bounce' | 'float' | 'wiggle';
}

export default function Mascot({
  message = "Beep! Boop! Beep! Hello friends! Let's learn!",
  position = 'bottom',
  animation = 'float',
}: MascotProps) {
  const positionClasses = {
    bottom: 'fixed bottom-8 right-8',
    center: 'mx-auto',
  };

  const animationClasses = {
    bounce: 'animate-bounce-slow',
    float: 'animate-float',
    wiggle: 'animate-wiggle',
  };

  return (
    <div className={`${positionClasses[position]} z-50`}>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative"
      >
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl px-4 py-3 shadow-lg whitespace-nowrap text-sm font-bold mb-2"
          >
            <div className="relative">
              {message}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          </motion.div>
        )}
        
        <div className={`${animationClasses[animation]} text-8xl`}>
          🤖
        </div>
      </motion.div>
    </div>
  );
}
