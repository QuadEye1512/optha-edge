import Link from 'next/link';
import type { ReactNode } from 'react';
import { DR_GRADES, GRADE_TONE_CLASSES } from '@/lib/dr/grades';

export function Page({ children, width = 'max-w-7xl' }: { children: ReactNode; width?: string }) {
  return (
    <div className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
      <div className={`mx-auto ${width}`}>{children}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{title}</h1>
        {description ? <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, description, actions, children, className = '' }: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/65 ${className}`}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/25 px-6 py-8 text-center">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {description ? <p className="mt-1 text-xs text-slate-600">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function Notice({ tone = 'amber', children }: { tone?: 'amber' | 'emerald' | 'rose' | 'cyan'; children: ReactNode }) {
  const tones = {
    amber: 'border-amber-500/25 bg-amber-500/5 text-amber-100/85',
    emerald: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-100/90',
    cyan: 'border-cyan-500/25 bg-cyan-500/5 text-cyan-100/90',
  } as const;
  return <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${tones[tone]}`}>{children}</div>;
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'cyan' | 'amber' | 'emerald' | 'rose' | 'violet'; children: ReactNode }) {
  const tones = {
    slate: 'border-slate-700 bg-slate-800 text-slate-300',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  } as const;
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function GradeBadge({ grade, source }: { grade: number | null; source?: string }) {
  if (source === 'ungradable') return <Badge tone="amber">Ungradable</Badge>;
  if (grade === null || grade === undefined) return <Badge>No grade</Badge>;
  const info = DR_GRADES[grade];
  const tone = GRADE_TONE_CLASSES[info.tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
      {info.label}
      {source === 'ai' ? <span className="font-normal opacity-70">· AI</span> : null}
      {source === 'clinician' ? <span className="font-normal opacity-70">· confirmed</span> : null}
    </span>
  );
}

export function StatCard({ label, value, note, href }: { label: string; value: ReactNode; note?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{value}</p>
      {note ? <p className="mt-1 text-[11px] text-slate-600">{note}</p> : null}
    </>
  );
  const className = 'block rounded-2xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5';
  return href ? <Link href={href} className={`${className} transition-colors hover:border-cyan-500/40`}>{body}</Link> : <article className={className}>{body}</article>;
}

export function ProbabilityBars({ probabilities, highlight }: { probabilities: readonly number[]; highlight: number | null }) {
  return (
    <div className="space-y-2.5">
      {DR_GRADES.map((grade, index) => {
        const value = probabilities[index] ?? 0;
        const tone = GRADE_TONE_CLASSES[grade.tone];
        return (
          <div key={grade.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className={index === highlight ? `font-semibold ${tone.text}` : 'text-slate-400'}>{grade.index} · {grade.label}</span>
              <span className="font-mono text-slate-400">{(value * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${index === highlight ? tone.bar : 'bg-slate-600'}`} style={{ width: `${Math.max(value * 100, 0.5)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15';

export const labelClass = 'block text-xs font-medium text-slate-400';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60';

export const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-60';

export function ResearchBanner() {
  return (
    <Notice>
      <span className="font-semibold text-amber-300">AI-assisted, research use only.</span> Not for diagnosis. Every AI grade must be confirmed or overridden by a clinician before it is final.
    </Notice>
  );
}
