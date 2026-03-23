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
          {label && <span className="text-sm font-bold text-gray-700">{label}</span>}
          {showNumbers && (
            <span className="text-sm font-bold text-gray-600">
              {current}/{total}
            </span>
          )}
        </div>
      )}
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
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
