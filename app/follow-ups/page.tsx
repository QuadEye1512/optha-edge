import Link from 'next/link';
import { followUpStatusAction } from '@/app/patients/actions';
import { SubmitButton } from '@/components/forms';
import { Badge, Card, EmptyState, Notice, Page, PageHeader } from '@/components/ui';
import { listFollowUps } from '@/data/followUps';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { formatDate, humanizeEnum } from '@/lib/format';

const VIEWS = [
  ['open', 'Upcoming'],
  ['overdue', 'Overdue'],
  ['completed', 'Closed'],
] as const;

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.PATIENT_READ)) {
    return <Page><Notice tone="rose">Your role cannot view follow-ups.</Notice></Page>;
  }
  const { view: rawView } = await searchParams;
  const view = VIEWS.find(([value]) => value === rawView)?.[0] ?? 'open';
  const rows = await listFollowUps(actor, view);
  const canManage = hasPermission(actor, PERMISSIONS.FOLLOWUP_MANAGE);

  return (
    <Page width="max-w-4xl">
      <PageHeader eyebrow="Care continuity" title="Follow-ups" description="Rescreening and review visits set during clinician review. Call patients who are overdue." />
      <div className="mt-6 flex gap-2">
        {VIEWS.map(([value, label]) => (
          <Link key={value} href={`/follow-ups?view=${value}`} className={`rounded-full border px-3 py-1.5 text-xs ${view === value ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>{label}</Link>
        ))}
      </div>
      <div className="mt-5">
        <Card title={`${rows.length} ${VIEWS.find(([value]) => value === view)?.[1].toLowerCase()}`}>
          {rows.length ? (
            <ul className="-my-2 divide-y divide-slate-800">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/patients/${row.patientId}`} className="text-sm font-semibold text-slate-200 hover:text-cyan-300">{row.patientName}</Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono text-cyan-400/80">{row.patientNumber}</span> · due {formatDate(row.dueAt)}
                      {row.examination ? <> · after <Link href={`/examinations/${row.examination.id}`} className="text-cyan-400">{humanizeEnum(row.examination.eye)} eye exam</Link></> : null}
                    </p>
                    {row.notes ? <p className="text-xs text-slate-500">{row.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.overdue ? <Badge tone="rose">Overdue</Badge> : <Badge>{humanizeEnum(row.status)}</Badge>}
                    {row.phone ? <a href={`tel:${row.phone}`} className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300">Call</a> : null}
                    {canManage && view !== 'completed' ? (
                      <>
                        <form action={followUpStatusAction.bind(null, row.id, 'COMPLETED')}><SubmitButton className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-300" pendingText="…">Done</SubmitButton></form>
                        <form action={followUpStatusAction.bind(null, row.id, 'MISSED')}><SubmitButton className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400" pendingText="…">Missed</SubmitButton></form>
                      </>
                    ) : null}
                    {canManage && view === 'completed' ? (
                      <form action={followUpStatusAction.bind(null, row.id, 'SCHEDULED')}><SubmitButton className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400" pendingText="…">Reopen</SubmitButton></form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Nothing here" description={view === 'overdue' ? 'No overdue follow-ups.' : undefined} />}
        </Card>
      </div>
    </Page>
  );
}
