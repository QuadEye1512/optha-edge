import Link from 'next/link';

interface ModulePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  requirements: readonly string[];
}

export default function ModulePlaceholder({ eyebrow, title, description, requirements }: ModulePlaceholderProps) {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M5.1 20h13.8a2 2 0 0 0 1.73-3L13.73 5a2 2 0 0 0-3.46 0L3.37 17a2 2 0 0 0 1.73 3Z" />
                </svg>
              </span>
              <div>
                <h2 className="font-semibold text-slate-200">Module not active</h2>
                <p className="text-xs text-slate-500">No demonstration or patient data is being fabricated.</p>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-8 text-center">
              <p className="text-sm text-slate-400">This workspace will become available after its security and data dependencies are configured.</p>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-sm font-semibold text-slate-200">Required before activation</h2>
            <ul className="mt-4 space-y-3">
              {requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2 text-xs leading-relaxed text-slate-400">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {requirement}
                </li>
              ))}
            </ul>
            <Link href="/" className="mt-6 inline-flex text-xs font-semibold text-cyan-400 hover:text-cyan-300">Return to overview →</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
