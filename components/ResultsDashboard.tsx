'use client';

import type { PredictionResult } from '@/types/prediction';
import BinaryResult from './BinaryResult';
import SeverityResult from './SeverityResult';

interface ResultsDashboardProps {
  mode: 'binary' | 'severity';
  state: 'idle' | 'loading' | 'results' | 'error';
  result?: PredictionResult | null;
  error?: string | null;
}

export default function ResultsDashboard({ mode, state, result, error }: ResultsDashboardProps) {
  const loadingLabel = mode === 'severity' ? 'Running DR severity model (InceptionV3)...' : 'Running DR detection model...';

  // IDLE
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border-2 border-dashed border-slate-700/50 bg-slate-800/20 p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">Analysis Results</h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          {mode === 'severity'
            ? 'Upload a retinal fundus image and click "Analyze" to grade DR severity.'
            : 'Upload a retinal fundus image and click "Analyze" to detect Diabetic Retinopathy.'}
        </p>
      </div>
    );
  }

  // LOADING
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700/50" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-cyan-400/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-400/70 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">Analyzing Retinal Image</h3>
        <p className="text-sm text-slate-400 animate-pulse">{loadingLabel}</p>
      </div>
    );
  }

  // ERROR
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-300 mb-2">Analysis Failed</h3>
        <p className="text-sm text-red-400/80 text-center max-w-xs">{error || 'An unexpected error occurred.'}</p>
      </div>
    );
  }

  // RESULTS — discriminated union narrows to correct type
  if (state === 'results' && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-slate-100">Model screening result</h2>
          <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
            ⚡ {result.inferenceTimeMs}ms
          </span>
        </div>

        {result.mode === 'binary' && <BinaryResult result={result.binary} />}
        {result.mode === 'severity' && <SeverityResult result={result.severity} />}

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-amber-100/80">
          <p className="font-semibold text-amber-300">Professional review required</p>
          <p className="mt-1 leading-relaxed">
            This research model configuration has not been cleared for clinical deployment. Its label order,
            preprocessing match, calibration, decision threshold, and validation evidence still require verification.
          </p>
          <dl className="mt-3 grid gap-1 text-slate-400 sm:grid-cols-2">
            <div><dt className="inline">Model: </dt><dd className="inline font-mono text-slate-300">{result.model.modelId}</dd></div>
            <div><dt className="inline">Preprocessing: </dt><dd className="inline font-mono text-slate-300">{result.model.preprocessingVersion}</dd></div>
          </dl>
        </div>
      </div>
    );
  }

  return null;
}
