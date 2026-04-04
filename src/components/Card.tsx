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
  const baseClasses = 'theme-surface rounded-3xl border p-6 transition-all duration-300';
  const bgClass = gradient 
    ? 'bg-gradient-to-b from-[#FF9126] to-[#FF9126] border-b-4 border-[#FF9126]' 
    : '';
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
