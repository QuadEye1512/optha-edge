import Link from 'next/link';
import { Card, Notice, Page, PageHeader, secondaryButton, StatCard } from '@/components/ui';
import { getReportStats } from '@/data/stats';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { DR_GRADES, GRADE_TONE_CLASSES } from '@/lib/dr/grades';

const RANGES = [30, 90, 365] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.EXAMINATION_READ)) {
    return <Page><Notice tone="rose">Your role cannot view reports.</Notice></Page>;
  }
  const { days: rawDays } = await searchParams;
  const days = RANGES.find((range) => String(range) === rawDays) ?? 90;
  const stats = await getReportStats(actor, days);
  const graded = stats.gradeCounts.reduce((sum, count) => sum + count, 0);
  const maxMonth = Math.max(1, ...stats.byMonth.map(([, count]) => count));

  return (
    <Page>
      <PageHeader
        eyebrow="Programme reporting"
        title="Reports"
        description="Screening volume, disease burden and AI–clinician agreement. Uses the clinician grade where signed, otherwise the AI grade."
        actions={<a href="/api/reports/examinations.csv" className={secondaryButton}>Export examinations (CSV)</a>}
      />
      <div className="mt-6 flex gap-2">
        {RANGES.map((range) => (
          <Link key={range} href={`/reports?days=${range}`} className={`rounded-full border px-3 py-1.5 text-xs ${days === range ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>Last {range} days</Link>
        ))}
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Screenings" value={stats.total} />
        <StatCard label="Patients with referable DR" value={stats.referablePatients} note="Moderate or worse" />
        <StatCard label="Ungradable rate" value={stats.total ? `${Math.round((stats.ungradable / stats.total) * 100)}%` : '—'} note={`${stats.ungradable} images`} />
        <StatCard label="Median Pi inference" value={stats.medianLatencyMs !== null ? `${stats.medianLatencyMs.toFixed(0)} ms` : '—'} note="Model only, excluding preprocessing" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Grade distribution" description={`${graded} graded examinations`}>
          <div className="space-y-3">
            {DR_GRADES.map((grade, index) => {
              const count = stats.gradeCounts[index];
              const share = graded ? count / graded : 0;
              return (
                <div key={grade.label}>
                  <div className="mb-1 flex justify-between text-xs"><span className={GRADE_TONE_CLASSES[grade.tone].text}>{grade.index} · {grade.label}</span><span className="font-mono text-slate-400">{count} ({(share * 100).toFixed(0)}%)</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${GRADE_TONE_CLASSES[grade.tone].bar}`} style={{ width: `${share * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="AI vs clinician" description="From signed reviews in this period">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"><dt className="text-[11px] text-slate-500">Reviewed</dt><dd className="mt-1 text-xl font-bold text-slate-100">{stats.reviewed}</dd></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"><dt className="text-[11px] text-slate-500">Agreed</dt><dd className="mt-1 text-xl font-bold text-emerald-300">{stats.agreements}</dd></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"><dt className="text-[11px] text-slate-500">Overridden</dt><dd className="mt-1 text-xl font-bold text-violet-300">{stats.disagreements}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Agreement rate: {stats.agreements + stats.disagreements ? `${Math.round((stats.agreements / (stats.agreements + stats.disagreements)) * 100)}%` : '—'}.
            Overrides on Pi-imager images are the evidence needed to validate the model on the 20D-lens prototype.
          </p>
        </Card>

        <Card title="Monthly volume">
          {stats.byMonth.length ? (
            <div className="flex h-40 items-end gap-2">
              {stats.byMonth.map(([month, count]) => (
                <div key={month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400">{count}</span>
                  <div className="w-full rounded-t-md bg-cyan-500/70" style={{ height: `${(count / maxMonth) * 120}px` }} />
                  <span className="text-[10px] text-slate-500">{month.slice(2)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500">No screenings in this period.</p>}
        </Card>

        <Card title="Capture & model">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-500">Image source</h3>
          <ul className="mt-2 space-y-1 text-sm">{stats.bySource.map(([source, count]) => <li key={source} className="flex justify-between"><span className="text-slate-300">{source === 'pi-camera' ? 'Pi camera (20D lens)' : source === 'upload' ? 'Phone / upload' : source}</span><span className="font-mono text-slate-400">{count}</span></li>)}</ul>
          <h3 className="mt-4 text-[11px] uppercase tracking-wider text-slate-500">Model version</h3>
          <ul className="mt-2 space-y-1 text-sm">{stats.byModel.map(([model, count]) => <li key={model} className="flex justify-between gap-2"><span className="truncate font-mono text-xs text-slate-300">{model}</span><span className="font-mono text-slate-400">{count}</span></li>)}</ul>
        </Card>
      </div>
    </Page>
  );
}
