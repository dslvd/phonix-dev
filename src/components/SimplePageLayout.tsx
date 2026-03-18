import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import NavigationHeader from './NavigationHeader';
import { Page, AppState } from '../App';

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
  appState?: AppState;
  navigate?: (page: Page) => void;
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
  appState,
  navigate,
  className = '',
}: SimplePageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"
        />
      </div>

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
                <motion.span
                  key={i}
                  className={`text-3xl transition-all ${
                    i < hearts ? 'text-red-500' : 'text-gray-600'
                  }`}
                  animate={i < hearts ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  ❤️
                </motion.span>
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
              <h1 className="font-baloo text-4xl md:text-5xl font-bold text-white mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-300 text-lg">{subtitle}</p>
              )}
            </motion.div>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 ${className}`}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
