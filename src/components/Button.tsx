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
    primary: 'bg-[#FF9126] border-b-4 border-[#FF9126] text-[#184a00] hover:brightness-105 hover:scale-105',
    secondary: 'bg-[#56b8e8] border border-[#2a4151] text-[#0a344a] hover:brightness-105 hover:scale-105',
    outline: 'theme-nav-button border hover:border-[#56b8e8] hover:text-inherit',
    success: 'bg-[#FF9126] border-b-4 border-[#FF9126] text-[#184a00] hover:brightness-105 hover:scale-105',
    danger: 'theme-nav-button border hover:brightness-105 hover:scale-105',
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
