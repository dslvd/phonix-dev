import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import NavigationHeader from './NavigationHeader';

interface SimplePageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showHearts?: boolean;
  hearts?: number;
  maxHearts?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
  className?: string;
}

export default function SimplePageLayout({
  children,
  title,
  subtitle,
  showHeader = true,
  showHearts = false,
  hearts = 5,
  maxHearts = 5,
  onBack,
  onLogout,
  onProfile,
  className = '',
}: SimplePageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden flex flex-col">
      {/* Simple dark background - no gradients */}

      {/* Header */}
      {showHeader && onBack && onLogout && (
        <NavigationHeader
          onBack={onBack}
          onLogout={onLogout}
          onProfile={onProfile}
          showProgress={false}
          title={title}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl">
          {/* Hearts Display */}
          {showHearts && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center gap-2 mb-8"
            >
              {[...Array(maxHearts)].map((_, i) => (
                <span key={i} className={i < hearts ? 'text-2xl' : 'text-gray-600 text-2xl'}>
                  ❤️
                </span>
              ))}
            </motion.div>
          )}

          {/* Title Section */}
          {title && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="font-baloo text-4xl font-bold text-white mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-400 text-lg">{subtitle}</p>
              )}
            </motion.div>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-gray-800 rounded-2xl p-6 shadow-2xl ${className}`}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
