import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export default function Card({
  children,
  onClick,
  className = '',
  hover = true,
  gradient = false,
}: CardProps) {
  const baseClasses = 'rounded-3xl p-6 card-shadow transition-all duration-300';
  const bgClass = gradient 
    ? 'bg-gradient-to-br from-orange-200 via-pink-200 to-purple-200' 
    : 'bg-white';
  const hoverClasses = hover ? 'hover:card-shadow-lg hover:-translate-y-2 cursor-pointer' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${baseClasses} ${bgClass} ${hoverClasses} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
