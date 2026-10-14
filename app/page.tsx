import Link from 'next/link';
import { getSystemReadinessDTO } from '@/data/system-readiness';

const METRICS = [
  { label: 'Total patients', value: '—', note: 'Authorized totals pending' },
  { label: 'Screenings performed', value: '—', note: 'No examination store' },
  { label: 'Ungradable images', value: '—', note: 'Quality model unavailable' },
  { label: 'Research models', value: '2', note: '0 clinically approved' },
] as const;

const READINESS = [
  { label: 'DR model artifacts', state: 'Configured', tone: 'cyan' },
  { label: 'Model validation package', state: 'Required', tone: 'amber' },
  { label: 'Authentication and roles', state: 'Not configured', tone: 'amber' },
  { label: 'Patient database', state: 'Not connected', tone: 'amber' },
  { label: 'Secure image storage', state: 'Not connected', tone: 'amber' },
] as const;

export default async function OverviewPage() {
  const systemReadiness = await getSystemReadinessDTO();
  const readiness = READINESS.map((item) =>
    item.label === 'Patient database'
      ? {
          ...item,
          state: systemReadiness.database.configured ? 'Prisma configured' : 'Not connected',
          tone: systemReadiness.database.configured ? 'cyan' : 'amber',
        }
      : item.label === 'Authentication and roles'
        ? {
            ...item,
            state: systemReadiness.authentication.mode === 'synthetic-development'
              ? 'Local synthetic only'
              : 'Not configured',
            tone: systemReadiness.authentication.mode === 'synthetic-development' ? 'cyan' : 'amber',
          }
        : item,
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Platform overview</p>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">Clinical screening workspace</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              AI-assisted retinal screening, medically reviewed education, and secure patient eye-care records in one platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/patients" className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700">Add patient</Link>
            <Link href="/screening" className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-transform hover:scale-[1.02]">Start screening</Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-100/80">
          <span className="font-semibold text-amber-300">Development notice:</span>{' '}
          {systemReadiness.database.configured
            ? 'Prisma and the synthetic patient workspace are configured locally. Secure image storage and a production identity provider are still required.'
            : 'Clinical data services are not connected, so unavailable metrics are shown as em dashes rather than invented values.'}{' '}
          Both AI models remain research-only pending validation.
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard metrics">
          {METRICS.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5 shadow-lg shadow-black/10">
              <p className="text-xs font-medium text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-100">{metric.value}</p>
              <p className="mt-2 text-[11px] text-slate-600">{metric.note}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Recent examinations</h2>
                <p className="mt-1 text-xs text-slate-500">Patient-associated, immutable screening records will appear here.</p>
              </div>
              <Link href="/examinations" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">View all</Link>
            </div>
            <div className="mt-5 grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/25 px-6 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-800 text-slate-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 3v4m12-4v4M5 11h5v5H5zM4 21h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z" /></svg>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-400">No examination data source</p>
                <p className="mt-1 text-xs text-slate-600">Connect authorized examination storage before creating clinical records.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-200">Deployment readiness</h2>
            <p className="mt-1 text-xs text-slate-500">Required controls for the active screening workflow.</p>
            <ul className="mt-5 space-y-3">
              {readiness.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-3">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.tone === 'cyan' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-amber-500/10 text-amber-300'}`}>{item.state}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Current screening workflow</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {['Patient and consent', 'Image and quality check', 'AI screening result'].map((step, index) => (
              <div key={step} className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
                <span className="text-[10px] font-bold text-cyan-500">0{index + 1}</span>
                <p className="mt-2 text-xs font-semibold text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

