'use client';

import type { SeverityResult as SeverityResultType } from '@/types/prediction';
import ProbabilityBar from './ProbabilityBar';

interface SeverityResultProps {
  result: SeverityResultType;
}

const SEVERITY_CONFIG: Record<
  SeverityResultType['level'],
  { color: string; bgColor: string; borderColor: string; dotColor: string; shadowColor: string; barColor: string }
> = {
  'No DR': {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    shadowColor: 'shadow-emerald-500/10',
    barColor: 'bg-emerald-500',
  },
  Mild: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    dotColor: 'bg-yellow-400',
    shadowColor: 'shadow-yellow-500/10',
    barColor: 'bg-yellow-400',
  },
  Moderate: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    dotColor: 'bg-orange-400',
    shadowColor: 'shadow-orange-500/10',
    barColor: 'bg-orange-400',
  },
  Severe: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    dotColor: 'bg-red-400',
    shadowColor: 'shadow-red-500/10',
    barColor: 'bg-red-500',
  },
  Proliferative: {
    color: 'text-red-300',
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-800/40',
    dotColor: 'bg-red-300',
    shadowColor: 'shadow-red-900/20',
    barColor: 'bg-red-300',
  },
};

const LEVELS: SeverityResultType['level'][] = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'];

export default function SeverityResult({ result }: SeverityResultProps) {
  const config = SEVERITY_CONFIG[result.level];

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Model-estimated DR severity
        </h3>
        <span
          id="severity-badge"
          className={`
            px-3 py-1 rounded-full text-sm font-semibold tracking-wide
            ${config.bgColor} ${config.color} border ${config.borderColor}
            shadow-lg ${config.shadowColor} transition-all duration-500
          `}
        >
          {result.level}
        </span>
      </div>

      {/* 5-dot severity scale */}
      <div className="flex items-center justify-between mb-4 px-1">
        {LEVELS.map((level, idx) => {
          const levelConfig = SEVERITY_CONFIG[level];
          const isActive = idx <= result.levelIndex;
          const isCurrent = idx === result.levelIndex;
          return (
            <div key={level} className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  rounded-full transition-all duration-500
                  ${isCurrent ? 'w-4 h-4 ring-2 ring-offset-1 ring-offset-slate-800' : 'w-3 h-3'}
                  ${isActive ? levelConfig.dotColor : 'bg-slate-600/50'}
                  ${isCurrent ? `ring-current ${levelConfig.color}` : ''}
                `}
              />
              <span className={`text-[10px] leading-tight ${isCurrent ? levelConfig.color + ' font-semibold' : 'text-slate-500'}`}>
                {level === 'Proliferative' ? 'Prolif.' : level}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${config.dotColor}`}
          style={{ width: `${(result.rawScore / 4) * 100}%` }}
        />
      </div>

      {/* Per-class probability bars */}
      {result.probabilities && result.probabilities.length === 5 && (
        <div className="space-y-2 mb-4">
          {LEVELS.map((level, idx) => (
            <ProbabilityBar
              key={level}
              label={level}
              percentage={Math.round(result.probabilities[idx] * 10000) / 100}
              color={idx === result.levelIndex ? SEVERITY_CONFIG[level].barColor : 'bg-slate-600'}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Highest model probability</span>
          <span className={`font-semibold font-mono ${config.color}`}>
            {result.probabilities
              ? `${(result.probabilities[result.levelIndex] * 100).toFixed(1)}%`
              : `${result.rawScore.toFixed(2)} / 4.00`}
          </span>
        </div>
      </div>
    </div>
  );
}
