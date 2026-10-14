'use client';

interface ProbabilityBarProps {
  label: string;
  percentage: number;  // 0-100
  color: string;       // tailwind bg color class OR hex
  showPercentage?: boolean;
  height?: string;
}

export default function ProbabilityBar({
  label,
  percentage,
  color,
  showPercentage = true,
  height = 'h-2.5',
}: ProbabilityBarProps) {
  const isHex = color.startsWith('#');
  const barStyle = isHex ? { backgroundColor: color, width: `${percentage}%` } : { width: `${percentage}%` };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        {showPercentage && (
          <span className="text-sm font-mono text-slate-400">{percentage.toFixed(1)}%</span>
        )}
      </div>
      <div className={`w-full ${height} bg-slate-700/50 rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-700 ease-out ${!isHex ? color : ''}`}
          style={barStyle}
        />
      </div>
    </div>
  );
}
