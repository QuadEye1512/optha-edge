'use client';

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ResultsDashboard from '@/components/ResultsDashboard';
import { analyzeImage } from '@/lib/api';
import type { PredictionResult } from '@/types/prediction';

type AppMode = 'select' | 'binary' | 'severity';
type AnalysisState = 'idle' | 'loading' | 'results' | 'error';

interface Toast {
  id: number;
  message: string;
}

export default function HomePage() {
  const [mode, setMode] = useState<AppMode>('select');
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const handleSelectMode = (selected: AppMode) => {
    if (selected === 'select') return;
    setMode(selected);
    setFile(null);
    setState('idle');
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file || mode === 'select') return;
    setState('loading');
    setResult(null);
    setError(null);

    try {
      const apiMode = mode === 'severity' ? 'severity' : 'binary';
      const response = await analyzeImage(file, apiMode);
      if (response.success) {
        setResult(response.result);
        setState('results');
      } else {
        setError(response.error.message);
        setState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setState('error');
    }
  };

  const handleFileSelected = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (!selectedFile) {
      setState('idle');
      setResult(null);
      setError(null);
    }
  };

  const handleBack = () => {
    setMode('select');
    setFile(null);
    setState('idle');
    setResult(null);
    setError(null);
  };

  // ── Mode labels for the analysis screen ─────────────────────────────────
  const modeLabel =
    mode === 'severity' ? 'DR Severity Grading' : 'DR / Non-DR Detection';
  const modeDesc =
    mode === 'severity'
      ? 'Upload a fundus photograph for 5-level DR severity grading (InceptionV3).'
      : 'Upload a fundus photograph for binary DR screening.';
  const infoTitle =
    mode === 'severity' ? 'DR Severity Grading' : 'Binary DR Screening';
  const infoDesc =
    mode === 'severity'
      ? 'Grades DR on a 5-level scale: No DR → Mild → Moderate → Severe → Proliferative, using InceptionV3.'
      : 'Detects whether Diabetic Retinopathy is present or absent using a lightweight binary ONNX model.';

  return (
    <div className="min-h-full">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/95 border border-slate-600/60 shadow-2xl shadow-black/40 backdrop-blur-xl text-slate-200 text-sm font-medium animate-toast-in"
            style={{ pointerEvents: 'auto' }}
          >
            <span className="text-lg">🚧</span>
            {toast.message}
          </div>
        ))}
      </div>

      {/* ── MODE SELECTION SCREEN ── */}
      {mode === 'select' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI-assisted retinal screening
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-3">
              Select Analysis Mode
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Choose the type of retinal analysis you want to perform on the fundus image.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* DR / Non-DR — ACTIVE */}
            <button
              id="mode-binary-btn"
              onClick={() => handleSelectMode('binary')}
              className="group relative flex flex-col items-start gap-4 p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-800/90 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-0.5 text-left"
            >
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                Research only
              </span>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-1 group-hover:text-cyan-300 transition-colors duration-200">
                  DR / Non-DR Detection
                </h3>
                <p className="text-sm text-slate-400">
                  Binary screening — detect presence or absence of Diabetic Retinopathy from a fundus photograph.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 mt-auto">
                Start Analysis
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>

            {/* DR Severity — ACTIVE */}
            <button
              id="mode-severity-btn"
              onClick={() => handleSelectMode('severity')}
              className="group relative flex flex-col items-start gap-4 p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-orange-500/50 hover:bg-slate-800/90 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-0.5 text-left"
            >
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                Research only
              </span>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-all duration-300">
                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-1 group-hover:text-orange-300 transition-colors duration-200">
                  DR Severity Grading
                </h3>
                <p className="text-sm text-slate-400">
                  5-level severity classification — No DR, Mild, Moderate, Severe, and Proliferative DR (InceptionV3).
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-400 mt-auto">
                Start Analysis
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>

            {/* Additional condition modules — unavailable until validated */}
            <button
              id="mode-multiclass-btn"
              onClick={() => showToast('No validated model has been supplied for additional ocular conditions.')}
              className="group relative flex flex-col items-start gap-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-purple-500/30 hover:bg-slate-800/60 transition-all duration-300 text-left cursor-pointer sm:col-span-2"
            >
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/25">
                Coming Soon
              </span>
              <div className="flex items-start gap-4 w-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/15 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-purple-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-400 mb-1">
                    Additional Ocular Screening Modules
                  </h3>
                  <p className="text-sm text-slate-500">
                    Future conditions will only be enabled when a task-specific model, label mapping, preprocessing pipeline, and validation evidence are approved.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-auto ml-16">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No validated model supplied
              </div>
            </button>
          </div>
        </main>
      )}

      {/* ── ANALYSIS SCREEN (binary or severity) ── */}
      {(mode === 'binary' || mode === 'severity') && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Change mode
            </button>
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
              Research-only model
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${mode === 'severity' ? 'bg-orange-500/15' : 'bg-cyan-500/15'}`}>
                    {mode === 'severity' ? (
                      <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${mode === 'severity' ? 'text-orange-400' : 'text-cyan-400'}`}>
                    {modeLabel}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-1">Upload Retinal Image</h2>
                <p className="text-sm text-slate-400">{modeDesc}</p>
              </div>

              <ImageUploader onFileSelected={handleFileSelected} disabled={state === 'loading'} />

              <button
                id="analyze-btn"
                onClick={handleAnalyze}
                disabled={!file || state === 'loading'}
                className={`
                  w-full py-3.5 px-6 rounded-xl text-base font-semibold
                  transition-all duration-300 ease-out
                  flex items-center justify-center gap-2
                  ${file && state !== 'loading'
                    ? mode === 'severity'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }
                `}
              >
                {state === 'loading' ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                    Analyze Image
                  </>
                )}
              </button>

              {/* Info card */}
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  About This Analysis
                </h4>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${mode === 'severity' ? 'bg-orange-500/10' : 'bg-red-500/10'}`}>
                    <span className="text-xs">{mode === 'severity' ? '📊' : '🔍'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">{infoTitle}</p>
                    <p className="text-xs text-slate-500">{infoDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div>
              <ResultsDashboard
                mode={mode === 'severity' ? 'severity' : 'binary'}
                state={state}
                result={result}
                error={error}
              />
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs leading-relaxed text-slate-400">
            OpthaEdge is a research screening and decision-support prototype. Results require professional review and are not a diagnosis. Seek urgent care for sudden vision loss, flashes, a curtain-like shadow, severe eye pain, a red eye with nausea, or a sudden major visual change.
          </p>
        </div>
      </footer>
    </div>
  );
}
