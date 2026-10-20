import Link from 'next/link';
import ExaminationTable from '@/components/examinations/ExaminationTable';
import { Card, Notice, Page, PageHeader, primaryButton, secondaryButton } from '@/components/ui';
import { listExaminations } from '@/data/examinations';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';

const STATUS_FILTERS = [
  ['', 'All'],
  ['PENDING_REVIEW', 'Awaiting review'],
  ['REVIEWED', 'Reviewed'],
  ['SCREENING_COMPLETE', 'Ungradable'],
] as const;

const GRADE_FILTERS = [
  ['', 'Any grade'],
  ['0', 'No DR'],
  ['1', 'Mild'],
  ['2', 'Moderate'],
  ['3', 'Severe'],
  ['4', 'Proliferative'],
  ['referable', 'Referable (≥2)'],
] as const;

export default async function ExaminationsPage({ searchParams }: { searchParams: Promise<{ status?: string; grade?: string; q?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.EXAMINATION_READ)) {
    return <Page><Notice tone="rose">Your role cannot view examinations.</Notice></Page>;
  }
  const params = await searchParams;
  const rows = await listExaminations(actor, { status: params.status, grade: params.grade, query: params.q });

  const link = (changes: Record<string, string>) => {
    const next = new URLSearchParams({ status: params.status ?? '', grade: params.grade ?? '', q: params.q ?? '', ...changes });
    for (const [key, value] of [...next.entries()]) if (!value) next.delete(key);
    const query = next.toString();
    return query ? `/examinations?${query}` : '/examinations';
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Screening records"
        title="Examinations"
        description="Every screening keeps its original image, quality check, model version and clinician review."
        actions={hasPermission(actor, PERMISSIONS.EXAMINATION_CREATE) ? <Link href="/screening" className={primaryButton}>New screening</Link> : null}
      />

      <form className="mt-6 flex gap-2" role="search">
        {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
        {params.grade ? <input type="hidden" name="grade" value={params.grade} /> : null}
        <input name="q" defaultValue={params.q ?? ''} placeholder="Patient name or ID" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500" />
        <button className={secondaryButton}>Search</button>
      </form>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_FILTERS.map(([value, label]) => (
          <Link key={label} href={link({ status: value })} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${(params.status ?? '') === value ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>{label}</Link>
        ))}
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {GRADE_FILTERS.map(([value, label]) => (
          <Link key={label} href={link({ grade: value })} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${(params.grade ?? '') === value ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>{label}</Link>
        ))}
      </div>

      <div className="mt-5">
        <Card title={`${rows.length} examination${rows.length === 1 ? '' : 's'}`} actions={<a href="/api/reports/examinations.csv" className="text-xs font-semibold text-cyan-400">Export CSV</a>}>
          <ExaminationTable rows={rows} empty="No examinations match these filters." />
        </Card>
      </div>
    </Page>
  );
}
