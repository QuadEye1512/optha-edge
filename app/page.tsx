import Link from 'next/link';
import { getDashboardStats } from '@/data/stats';
import { getSystemReadiness } from '@/data/system-readiness';
import { Badge, Card, EmptyState, GradeBadge, Page, PageHeader, primaryButton, ResearchBanner, secondaryButton, StatCard } from '@/components/ui';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { formatDateTime, humanizeEnum } from '@/lib/format';

export default async function OverviewPage() {
  const actor = await requireActor();
  const [stats, readiness] = await Promise.all([getDashboardStats(actor), getSystemReadiness()]);
  const canScreen = hasPermission(actor, PERMISSIONS.EXAMINATION_CREATE);

  return (
    <Page>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome, ${actor.displayName}`}
        description="Capture on the Raspberry Pi, review on your phone, and keep every patient's eye-care history in one place."
        actions={
          <>
            <Link href="/patients" className={secondaryButton}>Patients</Link>
            {canScreen ? <Link href="/screening" className={primaryButton}>Start screening</Link> : null}
          </>
        }
      />

      <div className="mt-6"><ResearchBanner /></div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Dashboard metrics">
        <StatCard label="Active patients" value={stats.patients} href="/patients" />
        <StatCard label="Screenings (30 days)" value={stats.exams30d} note={`${stats.examsTotal} in total`} href="/examinations" />
        <StatCard
          label="Awaiting review"
          value={stats.pendingReview}
          note="AI result not yet confirmed"
          href={hasPermission(actor, PERMISSIONS.REVIEW_SIGN) ? '/review-queue' : '/examinations?status=PENDING_REVIEW'}
        />
        <StatCard
          label="Follow-ups overdue"
          value={<span className={stats.overdueFollowUps ? 'text-rose-300' : undefined}>{stats.overdueFollowUps}</span>}
          note={`${stats.dueThisWeek} due this week`}
          href="/follow-ups?view=overdue"
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card title="Recent examinations" actions={<Link href="/examinations" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">View all</Link>}>
          {stats.recent.length ? (
            <ul className="-my-2 divide-y divide-slate-800">
              {stats.recent.map((exam) => (
                <li key={exam.id}>
                  <Link href={`/examinations/${exam.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-90">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{exam.patientName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono text-cyan-400/80">{exam.patientNumber}</span> · {humanizeEnum(exam.eye)} eye · {formatDateTime(exam.examinedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <GradeBadge grade={exam.grade} source={exam.gradeSource} />
                      <span className="text-[10px] text-slate-500">{humanizeEnum(exam.status)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No examinations yet"
              description="Register a patient, record consent and run the first screening."
              action={canScreen ? <Link href="/screening" className={primaryButton}>Start screening</Link> : undefined}
            />
          )}
        </Card>

        <Card title="System status" description="Live check of the edge device and platform services.">
          <ul className="space-y-2.5">
            {readiness.items.map((item) => (
              <li key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <Badge tone={item.ok ? 'emerald' : 'amber'}>{item.state}</Badge>
                </div>
                {item.detail ? <p className="mt-1 truncate text-[10px] text-slate-600">{item.detail}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Screening workflow</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Patient & consent', 'Register the patient and record image-processing consent.'],
            ['Capture', 'Pi camera through the 20D lens, or a phone photo uploaded here.'],
            ['Edge AI', 'The Pi checks quality and grades DR with the student model.'],
            ['Clinician review', 'Confirm or override the grade, set referral and follow-up.'],
            ['Patient guidance', 'AI-written education, diet and remedies, shared to the patient’s phone.'],
          ].map(([title, text], index) => (
            <li key={title} className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
              <span className="text-[10px] font-bold text-cyan-500">0{index + 1}</span>
              <p className="mt-1.5 text-xs font-semibold text-slate-200">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </Page>
  );
}
