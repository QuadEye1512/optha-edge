'use client';

import type { BinaryResult as BinaryResultType } from '@/types/prediction';
import ProbabilityBar from './ProbabilityBar';

interface BinaryResultProps {
  result: BinaryResultType;
}

export default function BinaryResult({ result }: BinaryResultProps) {
  const isDR = result.prediction === 'DR Detected';

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          DR model finding
        </h3>
        <span
          id="binary-badge"
          className={`
            px-3 py-1 rounded-full text-sm font-semibold tracking-wide
            transition-all duration-500
            ${isDR
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
            }
          `}
        >
          {isDR ? 'Suspected DR' : 'No DR finding detected'}
        </span>
      </div>

      {/* Probability bars */}
      <div className="space-y-3">
        <ProbabilityBar
          label="DR Probability"
          percentage={result.probability * 100}
          color={isDR ? 'bg-red-500' : 'bg-red-500/60'}
        />
        <ProbabilityBar
          label="Normal Probability"
          percentage={(1 - result.probability) * 100}
          color={!isDR ? 'bg-emerald-500' : 'bg-emerald-500/60'}
        />
      </div>

      {/* Confidence footer */}
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Highest model probability</span>
          <span className={`font-semibold font-mono ${isDR ? 'text-red-400' : 'text-emerald-400'}`}>
            {result.confidence.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
