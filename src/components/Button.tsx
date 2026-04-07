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
  const baseClasses = 'btn';
  
  const variantClasses = {
    primary: '',
    secondary: 'btn-secondary',
    outline: 'btn-ghost',
    success: '',
    danger: 'btn-ghost border-red-400 text-red-400 hover:bg-red-500/10',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? '' : 'cursor-pointer';

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
