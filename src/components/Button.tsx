import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-xl hover:scale-105',
    secondary: 'bg-gradient-to-r from-secondary to-secondary-dark text-white hover:shadow-xl hover:scale-105',
    outline: 'bg-white border-3 border-primary text-primary hover:bg-primary hover:text-white',
    success: 'bg-success text-white hover:shadow-xl hover:scale-105',
    danger: 'bg-danger text-white hover:shadow-xl hover:scale-105',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      {children}
    </motion.button>
  );
}
