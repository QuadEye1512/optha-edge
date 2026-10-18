import type { Metadata } from 'next';
import EducationView from '@/components/education/EducationView';
import { resolveShareLink } from '@/data/examinations';
import { GRADE_TONE_CLASSES } from '@/lib/dr/grades';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Your eye screening report — OpthaEdge',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const DECISION_TEXT: Record<string, string> = {
  REPEAT_IMAGING: 'Your eye photo was not clear enough to grade. Please return for a repeat photo.',
  INDETERMINATE: 'The result could not be decided from the photo. Your eye doctor will advise the next step.',
};

/** Public, token-gated patient view. Shows only the clinician-signed result. */
export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await resolveShareLink(token);

  if (!report) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          <p className="text-base font-semibold text-slate-100">This link has expired or is no longer available.</p>
          <p className="mt-2 text-sm text-slate-400">Please ask your clinic for a new link.</p>
        </div>
      </div>
    );
  }

  const tone = report.gradeInfo ? GRADE_TONE_CLASSES[report.gradeInfo.tone] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <header className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
        </span>
        <div>
          <p className="text-base font-bold text-white">Optha<span className="text-cyan-400">Edge</span></p>
          <p className="text-[11px] text-slate-500">{report.clinicName}</p>
        </div>
      </header>

      <h1 className="mt-6 text-2xl font-bold text-slate-100">Hello {report.firstName},</h1>
      <p className="mt-1 text-sm text-slate-400">Here is the result of your {report.eye === 'LEFT' ? 'left' : 'right'} eye screening on {formatDate(report.examinedAt)}.</p>

      <section className={`mt-5 rounded-2xl border p-5 ${tone ? `${tone.border} ${tone.bg}` : 'border-slate-700 bg-slate-900'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Your result</p>
        <p className={`mt-1 text-xl font-bold ${tone?.text ?? 'text-slate-100'}`}>{report.gradeInfo ? report.gradeInfo.clinicalName : 'Repeat check needed'}</p>
        <p className="mt-2 text-sm text-slate-200">{report.gradeInfo ? report.gradeInfo.summary : DECISION_TEXT[report.decision] ?? ''}</p>
        {report.referralUrgency !== 'NOT_APPLICABLE' ? (
          <p className="mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-200">
            {report.referralUrgency === 'URGENT' || report.referralUrgency === 'EMERGENCY' ? 'Please see an eye specialist as soon as possible.' : 'Please book an appointment with an eye specialist.'}
          </p>
        ) : null}
        {report.followUpDue ? <p className="mt-3 text-sm text-slate-200">Next eye check: <strong>{formatDate(report.followUpDue)}</strong></p> : null}
        <p className="mt-3 text-[11px] text-slate-400">Reviewed by {report.reviewer} on {formatDate(report.signedAt)}.</p>
      </section>

      {report.education ? (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <EducationView content={report.education.content} />
        </section>
      ) : null}

      <footer className="mt-8 text-center text-[11px] leading-relaxed text-slate-600">
        This screening used AI-assisted research software and was reviewed by a clinician. It does not replace a full eye examination.
        <br />Link valid until {formatDate(report.expiresAt)}.
      </footer>
    </div>
  );
}
