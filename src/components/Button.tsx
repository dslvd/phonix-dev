import { motion, type HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  fullWidth?: boolean;
  unstyled?: boolean;
}

export default function Button({
  children,
  variant: variantProp,
  size: sizeProp,
  icon,
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  unstyled = false,
  ...props
}: ButtonProps) {
  const variant = variantProp ?? 'primary';
  const size = sizeProp ?? 'md';
  const hasCustomUtilityStyling =
    /(?:^|\s)(?:theme-|bg-|rounded|border|shadow|h-\[|h-|w-\[|w-|min-w-|px-|py-|text-left|underline|absolute|fixed)/.test(
      className,
    );
  const useDefaultStyling = !unstyled && !(variantProp === undefined && hasCustomUtilityStyling);
  const baseClasses = useDefaultStyling ? 'btn' : '';
  
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
  const buttonSizeClass = useDefaultStyling ? sizeClasses[size] : '';
  const buttonVariantClass = useDefaultStyling ? variantClasses[variant] : '';

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      type={type}
      className={`${baseClasses} ${buttonVariantClass} ${buttonSizeClass} ${widthClass} ${disabledClass} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      {children}
    </motion.button>
  );
}
