import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showNumbers?: boolean;
  color?: 'primary' | 'secondary' | 'success';
}

export default function ProgressBar({
  current,
  total,
  label,
  showNumbers = true,
  color = 'primary',
}: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  const colorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success',
  };

  return (
    <div className="w-full">
      {(label || showNumbers) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="theme-title text-sm font-bold">{label}</span>}
          {showNumbers && (
            <span className="theme-title text-sm font-bold">
              {current}/{total}
            </span>
          )}
        </div>
      )}
      <div className="h-4 w-full overflow-hidden rounded-full bg-[color:var(--theme-border)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${colorClasses[color]} rounded-full`}
        />
      </div>
    </div>
  );
}
