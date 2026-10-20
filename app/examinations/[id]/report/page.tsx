import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';
import { getExaminationDetail } from '@/data/examinations';
import { requireActor } from '@/lib/auth/authorization';
import { DR_GRADES } from '@/lib/dr/grades';
import { formatDate, formatDateTime, humanizeEnum, percent } from '@/lib/format';

export default async function ExaminationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const exam = await getExaminationDetail(actor, id);
  if (!exam) notFound();
  const grade = exam.effectiveGrade.grade !== null ? DR_GRADES[exam.effectiveGrade.grade] : null;
  const prediction = exam.prediction;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/examinations/${exam.id}`} className="text-xs text-slate-400">← Back</Link>
        <PrintButton />
      </div>
      <article className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl sm:p-10 print:rounded-none print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xl font-bold">Optha<span className="text-cyan-600">Edge</span></p>
            <p className="text-xs text-slate-500">Diabetic retinopathy screening report</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Report generated {formatDateTime(new Date())}</p>
            <p>Exam ID {exam.id.slice(-10)}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p><span className="text-slate-500">Patient: </span><strong>{exam.patient.displayName}</strong></p>
          <p><span className="text-slate-500">Patient ID: </span>{exam.patient.patientNumber}</p>
          <p><span className="text-slate-500">Age / sex: </span>{exam.patient.age ?? '—'} / {humanizeEnum(exam.patient.sexAtBirth)}</p>
          <p><span className="text-slate-500">Eye: </span>{humanizeEnum(exam.eye)}</p>
          <p><span className="text-slate-500">Examined: </span>{formatDateTime(exam.examinedAt)}</p>
          <p><span className="text-slate-500">Capture: </span>{exam.imageSource === 'pi-camera' ? 'Raspberry Pi camera, 20D lens' : 'Uploaded image'}</p>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Result</p>
          <p className="mt-1 text-lg font-bold">{grade ? grade.clinicalName : exam.effectiveGrade.source === 'ungradable' ? 'Ungradable image — recapture required' : 'No grade'}</p>
          <p className="mt-1 text-sm text-slate-600">
            {exam.review ? `Clinician review: ${humanizeEnum(exam.review.decision)} — signed by ${exam.review.reviewer} on ${formatDate(exam.review.signedAt)}.` : 'Preliminary AI result — not yet reviewed by a clinician.'}
          </p>
          {grade ? <p className="mt-2 text-sm"><strong>Recommendation:</strong> {grade.suggestedFollowUpText}{exam.review && exam.review.referralUrgency !== 'NOT_APPLICABLE' ? ` · ${humanizeEnum(exam.review.referralUrgency)} referral` : ''}</p> : null}
          {exam.followUps[0] ? <p className="mt-1 text-sm"><strong>Next visit:</strong> {formatDate(exam.followUps[0].dueAt)}</p> : null}
          {exam.review?.assessment ? <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{exam.review.assessment}</p> : null}
        </section>

        {prediction && prediction.status === 'COMPLETED' ? (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI model output</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {DR_GRADES.map((g, index) => (
                  <tr key={g.label} className="border-b border-slate-100">
                    <td className="py-1">{g.index} · {g.label}</td>
                    <td className="py-1 text-right font-mono">{percent(prediction.probabilities[index])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">Any DR: {percent(prediction.anyDrProbability)} · Referable: {percent(prediction.referableProbability)} · Model {prediction.modelVersion} · Preprocessing {prediction.preprocessingVersion}</p>
          </section>
        ) : null}

        {exam.education ? (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Guidance for the patient</p>
            <p className="mt-1 text-sm font-semibold">{exam.education.content.headline}</p>
            <p className="mt-2 text-sm text-slate-700">{exam.education.content.whatThisMeansForYou.split(/\n\s*\n/)[0]}</p>
            <p className="mt-3 text-sm font-semibold">Diet & natural support</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
              {exam.education.content.naturalRemedies.map((remedy) => <li key={remedy.name}><strong>{remedy.name}:</strong> {remedy.howToConsume}</li>)}
            </ul>
            <p className="mt-3 text-sm font-semibold text-rose-700">Seek same-day eye care for</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{exam.education.content.warningSigns.map((sign) => <li key={sign}>{sign}</li>)}</ul>
          </section>
        ) : null}

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
          AI-assisted screening with research software (not a medical device). This report does not replace a full eye examination by an ophthalmologist. Seek urgent care for sudden vision loss, flashes, a curtain over vision, or severe eye pain.
        </footer>
      </article>
    </div>
  );
}
