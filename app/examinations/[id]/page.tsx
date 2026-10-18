import Link from 'next/link';
import { notFound } from 'next/navigation';
import { amendReviewAction, generateEducationAction, revokeShareLinksAction } from '@/app/examinations/actions';
import { scheduleFollowUpAction } from '@/app/patients/actions';
import EducationView from '@/components/education/EducationView';
import ReviewForm from '@/components/examinations/ReviewForm';
import SharePanel from '@/components/examinations/SharePanel';
import { ActionForm, SubmitButton } from '@/components/forms';
import {
  Badge,
  Card,
  GradeBadge,
  inputClass,
  labelClass,
  Notice,
  Page,
  PageHeader,
  ProbabilityBars,
  ResearchBanner,
  secondaryButton,
} from '@/components/ui';
import { getExaminationDetail } from '@/data/examinations';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { DR_GRADES } from '@/lib/dr/grades';
import { CURATED_GENERATOR } from '@/lib/education/curated';
import { dateInputValue, formatDate, formatDateTime, humanizeEnum, percent } from '@/lib/format';

const QUALITY_REASON: Record<string, string> = { BLURRY: 'Blurred', TOO_DARK: 'Too dark', TOO_BRIGHT: 'Over-exposed' };

export default async function ExaminationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.EXAMINATION_READ)) {
    return <Page><Notice tone="rose">Your role cannot view examinations.</Notice></Page>;
  }
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const exam = await getExaminationDetail(actor, id);
  if (!exam) notFound();

  const prediction = exam.prediction;
  const gradable = prediction?.status === 'COMPLETED';
  const aiGrade = gradable && prediction?.grade !== null && prediction!.grade! >= 0 ? prediction!.grade : null;
  const canSign = hasPermission(actor, PERMISSIONS.REVIEW_SIGN);
  const canEducate = hasPermission(actor, PERMISSIONS.EDUCATION_GENERATE) && exam.effectiveGrade.grade !== null;
  const canShare = hasPermission(actor, PERMISSIONS.REPORT_SHARE) && exam.status === 'REVIEWED';
  const canFollowUp = hasPermission(actor, PERMISSIONS.FOLLOWUP_MANAGE);
  const effective = exam.effectiveGrade.grade !== null ? DR_GRADES[exam.effectiveGrade.grade] : null;

  return (
    <Page>
      <Link href={`/patients/${exam.patient.id}`} className="text-xs font-medium text-slate-500 hover:text-slate-300">← {exam.patient.displayName}</Link>
      <div className="mt-3">
        <PageHeader
          eyebrow={`${humanizeEnum(exam.eye)} eye · ${formatDateTime(exam.examinedAt)}`}
          title={effective ? effective.clinicalName : gradable ? 'Awaiting review' : 'Ungradable image'}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <GradeBadge grade={exam.effectiveGrade.grade} source={exam.effectiveGrade.source} />
              <Badge tone={exam.status === 'REVIEWED' ? 'emerald' : exam.status === 'PENDING_REVIEW' ? 'amber' : 'slate'}>{humanizeEnum(exam.status)}</Badge>
              <span className="text-xs text-slate-500">{exam.patient.patientNumber} · captured by {exam.createdBy}</span>
            </span>
          }
          actions={<Link href={`/examinations/${exam.id}/report`} className={secondaryButton}>Printable report</Link>}
        />
      </div>

      <div className="mt-5 space-y-3">
        {isNew === '1' && gradable ? <Notice tone="cyan">Screening complete on the Raspberry Pi. {canSign ? 'Review the original image and sign below.' : 'A clinician will review this result.'}</Notice> : null}
        <ResearchBanner />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card title="Retinal image" description={exam.imageSource === 'pi-camera' ? 'Captured with the Pi camera through the 20D lens' : 'Uploaded image processed on the Pi'}>
          {exam.image ? (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <a href={`/api/images/${exam.image.id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-700 bg-black">
                  {/* Authorized, decrypted on request; next/image would cache it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/images/${exam.image.id}`} alt={`Original retinal image, ${exam.eye.toLowerCase()} eye`} className="aspect-square w-full object-contain" />
                </a>
                {exam.image.hasModelInput ? (
                  <div className="w-24 sm:w-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/images/${exam.image.id}?variant=model-input`} alt="Preprocessed 224 × 224 model input" className="aspect-square w-full rounded-lg border border-slate-700 object-cover" />
                    <p className="mt-1.5 text-[10px] leading-tight text-slate-500">What the model saw (denoised, ROI-cropped, 224 px)</p>
                  </div>
                ) : null}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-2.5"><dt className="text-slate-500">Quality</dt><dd className={exam.image.quality === 'GRADABLE' ? 'text-emerald-300' : 'text-amber-300'}>{humanizeEnum(exam.image.quality)}</dd></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-2.5"><dt className="text-slate-500">Sharpness</dt><dd className="text-slate-300">{exam.quality?.sharpness ?? '—'}</dd></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-2.5"><dt className="text-slate-500">Brightness</dt><dd className="text-slate-300">{exam.quality?.brightness ?? '—'}</dd></div>
              </dl>
              {exam.image.qualityReasons.length ? <p className="mt-2 text-xs text-amber-300">Rejected: {exam.image.qualityReasons.map((r) => QUALITY_REASON[r] ?? r).join(', ')}. Recapture the image.</p> : null}
              <p className="mt-3 break-all text-[10px] text-slate-600">{exam.image.width} × {exam.image.height} · sha256 {exam.image.sha256.slice(0, 20)}… · stored encrypted</p>
            </>
          ) : <p className="text-sm text-slate-500">No image stored.</p>}
        </Card>

        <Card title="AI result (preliminary)" description="Student model (MobileNetV3 + LiteCBAM) on the Raspberry Pi">
          {gradable && prediction ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <GradeBadge grade={aiGrade} />
                <span className="text-sm text-slate-300">Model probability <span className="font-mono font-semibold">{percent(prediction.confidence)}</span></span>
              </div>
              <div className="mt-4"><ProbabilityBars probabilities={prediction.probabilities} highlight={aiGrade} /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"><p className="text-slate-500">Any DR (grade ≥ 1)</p><p className="mt-1 font-mono text-base text-slate-100">{percent(prediction.anyDrProbability)}</p></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"><p className="text-slate-500">Referable (≥ moderate)</p><p className="mt-1 font-mono text-base text-slate-100">{percent(prediction.referableProbability)}</p></div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Watch for probability split between neighbouring grades — the model may be uncertain. Probabilities are not calibrated.</p>
            </>
          ) : (
            <Notice>The quality gate rejected this image, so no grade was produced. Capture a new image.</Notice>
          )}
          {prediction ? (
            <dl className="mt-4 space-y-1 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
              <div className="flex justify-between gap-2"><dt>Model version</dt><dd className="font-mono text-slate-400">{prediction.modelVersion}</dd></div>
              <div className="flex justify-between gap-2"><dt>Preprocessing</dt><dd className="font-mono text-slate-400">{prediction.preprocessingVersion ?? '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt>Inference time</dt><dd className="font-mono text-slate-400">{prediction.inferenceTimeMs !== null ? `${prediction.inferenceTimeMs} ms` : '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt>Status</dt><dd className="text-slate-400">{humanizeEnum(prediction.deploymentStatus)}</dd></div>
            </dl>
          ) : null}
        </Card>

        <Card title="Clinician review" description="Confirm or override the AI grade, then sign. Signed reviews are locked." className="lg:col-span-2">
          {exam.review ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={exam.review.decision === 'AGREE' ? 'emerald' : 'violet'}>{humanizeEnum(exam.review.decision)}</Badge>
                {exam.review.confirmedGrade !== null ? <GradeBadge grade={exam.review.confirmedGrade} source="clinician" /> : null}
                {exam.review.referralUrgency !== 'NOT_APPLICABLE' ? <Badge tone="rose">{humanizeEnum(exam.review.referralUrgency)} referral</Badge> : null}
                <span className="text-xs text-slate-500">Signed by {exam.review.reviewer} · {formatDateTime(exam.review.signedAt)}</span>
              </div>
              <p className="whitespace-pre-line text-sm text-slate-300">{exam.review.assessment}</p>
              {exam.review.repeatImagingReason ? <p className="text-xs text-amber-300">Repeat imaging: {exam.review.repeatImagingReason}</p> : null}
              {exam.referrals.map((referral) => (
                <p key={referral.id} className="text-xs text-slate-400">Referral: {referral.reason}{referral.destination ? ` → ${referral.destination}` : ''}</p>
              ))}
              {exam.review.amendments.length ? (
                <ul className="space-y-2">
                  {exam.review.amendments.map((amendment) => (
                    <li key={amendment.id} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs">
                      <p className="text-violet-200">{amendment.amendment}</p>
                      <p className="mt-1 text-slate-500">Amended by {amendment.author} · {formatDateTime(amendment.createdAt)} · Reason: {amendment.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canSign ? (
                <details className="rounded-xl border border-slate-800 bg-slate-950/30">
                  <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-cyan-300">+ Add amendment</summary>
                  <div className="border-t border-slate-800 p-4">
                    <ActionForm action={amendReviewAction.bind(null, exam.id)} className="grid gap-3">
                      <label className={labelClass}>Reason<input name="reason" className={inputClass} /></label>
                      <label className={labelClass}>Amendment<textarea name="amendment" rows={3} className={inputClass} /></label>
                      <div><SubmitButton>Add amendment</SubmitButton></div>
                    </ActionForm>
                  </div>
                </details>
              ) : null}
            </div>
          ) : canSign ? (
            <ReviewForm examinationId={exam.id} aiGrade={aiGrade} />
          ) : (
            <p className="text-sm text-slate-400">Awaiting review by a clinician. The AI grade is preliminary until then.</p>
          )}
        </Card>

        <Card
          title="Patient education"
          description="Disease explanation, diet and natural remedies — written for the patient by Claude, checked against their medicines."
          className="lg:col-span-2"
          actions={canEducate ? (
            <ActionForm action={generateEducationAction.bind(null, exam.id)} className="flex flex-col items-end gap-1">
              <SubmitButton pendingText="Writing (up to a minute)…" className={secondaryButton}>{exam.education ? 'Regenerate' : 'Generate'}</SubmitButton>
            </ActionForm>
          ) : undefined}
        >
          {exam.education ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Badge tone={exam.education.generator === CURATED_GENERATOR ? 'slate' : 'violet'}>{exam.education.generator === CURATED_GENERATOR ? 'Curated guidance' : 'AI-written (Claude)'}</Badge>
                <span>{exam.education.language} · based on {exam.education.gradeSource === 'clinician-confirmed' ? 'clinician-confirmed' : 'preliminary AI'} grade {exam.education.grade} · {formatDateTime(exam.education.createdAt)}</span>
              </div>
              {exam.review && exam.review.confirmedGrade !== null && exam.education.gradeSource !== 'clinician-confirmed' ? (
                <div className="mb-4"><Notice>This education was written before the review was signed. Regenerate it so it reflects the confirmed grade.</Notice></div>
              ) : null}
              <EducationView content={exam.education.content} />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              {exam.effectiveGrade.grade === null ? 'Education becomes available once there is a grade.' : 'Not generated yet. It is personalised with the patient\'s age, diabetes history, latest HbA1c and blood pressure, medicines and allergies (no name or ID is sent).'}
            </p>
          )}
        </Card>

        <Card title="Follow-up" description={effective ? `Suggested: ${effective.suggestedFollowUpText}` : undefined}>
          {exam.followUps.length ? (
            <ul className="space-y-2 text-sm">
              {exam.followUps.map((followUp) => (
                <li key={followUp.id} className="flex justify-between gap-2"><span className="text-slate-200">{formatDate(followUp.dueAt)}</span><Badge>{humanizeEnum(followUp.status)}</Badge></li>
              ))}
            </ul>
          ) : <p className="text-xs text-slate-500">No follow-up linked to this examination.</p>}
          {canFollowUp ? (
            <ActionForm action={scheduleFollowUpAction.bind(null, exam.patient.id, exam.id)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className={labelClass}>Schedule another<input type="date" name="dueAt" min={dateInputValue(new Date())} className={inputClass} /></label>
              <input type="hidden" name="notes" value="Retinal rescreening" />
              <SubmitButton className={secondaryButton}>Schedule</SubmitButton>
            </ActionForm>
          ) : null}
        </Card>

        <Card title="Share with patient" description="Send the confirmed result and education to the patient's phone.">
          {canShare ? (
            <>
              <SharePanel examinationId={exam.id} patientPhone={exam.patient.phone} />
              {exam.activeShares.length ? (
                <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
                  <p>{exam.activeShares.length} active link{exam.activeShares.length === 1 ? '' : 's'} · opened {exam.activeShares.reduce((sum, share) => sum + share.viewCount, 0)} times</p>
                  <form action={revokeShareLinksAction.bind(null, exam.id)} className="mt-2">
                    <SubmitButton className="text-xs font-semibold text-rose-300" pendingText="Revoking…">Revoke all links</SubmitButton>
                  </form>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-slate-500">{exam.status === 'REVIEWED' ? 'Your role cannot share reports.' : 'Available after a clinician signs the review.'}</p>
          )}
        </Card>
      </div>
    </Page>
  );
}
