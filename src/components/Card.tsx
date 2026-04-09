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
  const baseClasses = 'card p-6 transition-transform duration-200';
  const bgClass = gradient ? 'bg-[color:var(--primary)] border-transparent' : '';
  const hoverClasses = hover ? 'hover:-translate-y-1' : '';
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
