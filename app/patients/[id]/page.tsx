import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  addAllergyAction,
  addMeasurementAction,
  addMedicalHistoryAction,
  addMedicationAction,
  addNoteAction,
  addOcularHistoryAction,
  archivePatientAction,
  consentAction,
  followUpStatusAction,
  scheduleFollowUpAction,
  stopMedicationAction,
  updateDemographicsAction,
} from '@/app/patients/actions';
import { ActionForm, SubmitButton } from '@/components/forms';
import Sparkline from '@/components/Sparkline';
import {
  Badge,
  Card,
  dangerButton,
  EmptyState,
  GradeBadge,
  inputClass,
  labelClass,
  Notice,
  Page,
  PageHeader,
  primaryButton,
  secondaryButton,
} from '@/components/ui';
import { getPatientDetail, type PatientDetailDTO } from '@/data/patients';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { ageInYears, dateInputValue, formatDate, formatDateTime, humanizeEnum } from '@/lib/format';
import {
  DIABETES_TYPE_OPTIONS,
  MEASUREMENT_OPTIONS,
  PREGNANCY_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  SMOKING_OPTIONS,
} from '@/lib/patients/validation';

const SECTIONS = [
  ['eyes', 'Eye screening'],
  ['vitals', 'Vitals & labs'],
  ['history', 'Medical history'],
  ['medicines', 'Medicines & allergies'],
  ['ocular', 'Eye history'],
  ['care', 'Follow-ups'],
  ['notes', 'Notes'],
  ['consent', 'Consent'],
  ['details', 'Details'],
] as const;

function Collapsible({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group mt-4 rounded-xl border border-slate-800 bg-slate-950/30">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-cyan-300 marker:hidden">
        <span className="group-open:hidden">+ </span><span className="hidden group-open:inline">− </span>{summary}
      </summary>
      <div className="border-t border-slate-800 p-4">{children}</div>
    </details>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`${labelClass} ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>;
}

function Options({ values }: { values: readonly string[] }) {
  return <>{values.map((value) => <option key={value} value={value}>{humanizeEnum(value)}</option>)}</>;
}

function latestPerEye(patient: PatientDetailDTO) {
  return (['RIGHT', 'LEFT'] as const).map((eye) => ({ eye, exam: patient.examinations.find((exam) => exam.eye === eye) ?? null }));
}

export default async function PatientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const { created } = await searchParams;
  if (!hasPermission(actor, PERMISSIONS.PATIENT_READ)) {
    return <Page><Notice tone="rose">Your role does not grant permission to view patient records.</Notice></Page>;
  }
  const patient = await getPatientDetail(actor, id);
  if (!patient) notFound();

  const canEdit = hasPermission(actor, PERMISSIONS.PATIENT_UPDATE);
  const canScreen = hasPermission(actor, PERMISSIONS.EXAMINATION_CREATE) && patient.imageConsent && patient.status === 'ACTIVE';
  const canFollowUp = hasPermission(actor, PERMISSIONS.FOLLOWUP_MANAGE);
  const age = ageInYears(patient.demographics?.dateOfBirth);
  const history = patient.history[0];
  const hba1c = patient.measurements.filter((m) => m.type === 'HBA1C').slice(0, 12).reverse();
  const nextFollowUp = patient.followUps.find((followUp) => followUp.status === 'SCHEDULED' || followUp.status === 'DUE');
  const activeMeds = patient.medications.filter((medication) => !medication.endedAt);
  const today = dateInputValue(new Date());

  const consentByPurpose = new Map<string, (typeof patient.consents)[number]>();
  for (const consent of patient.consents) {
    if (!consentByPurpose.has(consent.purpose)) consentByPurpose.set(consent.purpose, consent);
  }

  return (
    <Page>
      <Link href="/patients" className="text-xs font-medium text-slate-500 hover:text-slate-300">← All patients</Link>
      <div className="mt-3">
        <PageHeader
          eyebrow={patient.patientNumber}
          title={patient.displayName}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{age !== null ? `${age} years` : 'Age not recorded'} · {humanizeEnum(patient.demographics?.sexAtBirth)}</span>
              {patient.phone ? <a href={`tel:${patient.phone}`} className="text-cyan-400">{patient.phone}</a> : null}
              {patient.demographics?.preferredLanguage ? <span>Language: {patient.demographics.preferredLanguage}</span> : null}
              {patient.status !== 'ACTIVE' ? <Badge tone="rose">{humanizeEnum(patient.status)}</Badge> : null}
            </span>
          }
          actions={
            canScreen ? (
              <Link href={`/screening?patientId=${patient.id}`} className={primaryButton}>New screening</Link>
            ) : (
              <Badge tone="amber">{patient.imageConsent ? 'Screening unavailable' : 'Imaging consent needed'}</Badge>
            )
          }
        />
      </div>

      {created === '1' ? <div className="mt-4"><Notice tone="emerald">Patient registered. Record vitals and history, then start the first screening.</Notice></div> : null}

      <nav className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Patient record sections">
        {SECTIONS.map(([anchor, label]) => (
          <a key={anchor} href={`#${anchor}`} className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40">{label}</a>
        ))}
      </nav>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {latestPerEye(patient).map(({ eye, exam }) => (
          <div key={eye} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
            <p className="text-xs text-slate-500">{humanizeEnum(eye)} eye · latest</p>
            <div className="mt-2">{exam ? <GradeBadge grade={exam.grade} source={exam.gradeSource} /> : <span className="text-sm text-slate-600">Not screened</span>}</div>
            {exam ? <Link href={`/examinations/${exam.id}`} className="mt-2 block text-[11px] text-cyan-400">{formatDate(exam.examinedAt)} →</Link> : null}
          </div>
        ))}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
          <p className="text-xs text-slate-500">Latest HbA1c</p>
          <p className="mt-1 text-xl font-bold text-slate-100">{hba1c.length ? `${hba1c[hba1c.length - 1].value}%` : '—'}</p>
          {hba1c.length > 1 ? <Sparkline values={hba1c.map((m) => m.value)} /> : null}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
          <p className="text-xs text-slate-500">Next follow-up</p>
          <p className={`mt-1 text-sm font-semibold ${nextFollowUp && new Date(nextFollowUp.dueAt) < new Date() ? 'text-rose-300' : 'text-slate-100'}`}>
            {nextFollowUp ? formatDate(nextFollowUp.dueAt) : 'None scheduled'}
          </p>
          {history ? <p className="mt-1 text-[11px] text-slate-500">{humanizeEnum(history.diabetesType)} diabetes{history.diabetesDiagnosedAt ? ` since ${history.diabetesDiagnosedAt.slice(0, 4)}` : ''}</p> : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Eye screening timeline */}
        <Card title={<span id="eyes">Eye screening history</span>} description="Each examination keeps the AI output and the clinician's signed review separately." className="xl:col-span-2 scroll-mt-24">
          {patient.examinations.length ? (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Eye</th><th className="px-4 py-2 font-medium">Grade</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Source</th><th className="px-4 py-2" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {patient.examinations.map((exam) => (
                    <tr key={exam.id}>
                      <td className="px-4 py-2.5 text-slate-300">{formatDateTime(exam.examinedAt)}</td>
                      <td className="px-4 py-2.5 text-slate-400">{humanizeEnum(exam.eye)}</td>
                      <td className="px-4 py-2.5"><GradeBadge grade={exam.grade} source={exam.gradeSource} /></td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{humanizeEnum(exam.status)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{exam.imageSource === 'pi-camera' ? 'Pi camera' : 'Upload'} · {exam.createdBy}</td>
                      <td className="px-4 py-2.5 text-right"><Link href={`/examinations/${exam.id}`} className="text-xs font-semibold text-cyan-400">Open →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No screenings yet" action={canScreen ? <Link href={`/screening?patientId=${patient.id}`} className={primaryButton}>Start screening</Link> : undefined} />
          )}
        </Card>

        {/* Vitals */}
        <Card title={<span id="vitals">Vitals & lab results</span>} description="HbA1c, blood pressure and lipids drive retinopathy risk." className="scroll-mt-24">
          {patient.latestMeasurements.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {patient.latestMeasurements.map((m) => (
                <div key={m.type} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <p className="text-[11px] text-slate-500">{m.label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-100">{m.value} <span className="text-xs font-normal text-slate-500">{m.unit}</span></p>
                  <p className="text-[10px] text-slate-600">{formatDate(m.observedAt)}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No measurements recorded" />}
          {patient.measurements.length > patient.latestMeasurements.length ? (
            <Collapsible summary={`All ${patient.measurements.length} measurements`}>
              <ul className="divide-y divide-slate-800 text-xs">
                {patient.measurements.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2 py-1.5 text-slate-400"><span>{m.label}</span><span className="text-slate-300">{m.value} {m.unit} · {formatDate(m.observedAt)}</span></li>
                ))}
              </ul>
            </Collapsible>
          ) : null}
          {canEdit ? (
            <Collapsible summary="Record a measurement">
              <ActionForm action={addMeasurementAction.bind(null, patient.id)} className="grid gap-3 sm:grid-cols-2">
                <Field label="Measurement">
                  <select name="type" className={inputClass}>{MEASUREMENT_OPTIONS.map((o) => <option key={o.type} value={o.type}>{o.label} ({o.unit})</option>)}</select>
                </Field>
                <Field label="Value"><input name="value" type="number" step="any" inputMode="decimal" className={inputClass} required /></Field>
                <Field label="Date"><input name="observedAt" type="date" defaultValue={today} max={today} className={inputClass} /></Field>
                <Field label="Source (optional)"><input name="source" placeholder="Lab report, clinic" className={inputClass} /></Field>
                <div className="sm:col-span-2"><SubmitButton>Save measurement</SubmitButton></div>
              </ActionForm>
            </Collapsible>
          ) : null}
        </Card>

        {/* Medical history */}
        <Card title={<span id="history">Medical history</span>} description="Versioned: each update is kept, never overwritten." className="scroll-mt-24">
          {history ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[11px] text-slate-500">Diabetes</dt><dd className="text-slate-200">{humanizeEnum(history.diabetesType)}</dd></div>
              <div><dt className="text-[11px] text-slate-500">Diagnosed</dt><dd className="text-slate-200">{formatDate(history.diabetesDiagnosedAt)}</dd></div>
              <div><dt className="text-[11px] text-slate-500">Smoking</dt><dd className="text-slate-200">{humanizeEnum(history.smokingStatus)}</dd></div>
              <div><dt className="text-[11px] text-slate-500">Pregnancy</dt><dd className="text-slate-200">{humanizeEnum(history.pregnancyStatus)}</dd></div>
              {history.visualSymptoms ? <div className="col-span-2"><dt className="text-[11px] text-slate-500">Visual symptoms</dt><dd className="text-slate-300">{history.visualSymptoms}</dd></div> : null}
              {history.notes ? <div className="col-span-2"><dt className="text-[11px] text-slate-500">Notes</dt><dd className="whitespace-pre-line text-slate-300">{history.notes}</dd></div> : null}
              <div className="col-span-2 text-[11px] text-slate-600">Recorded {formatDateTime(history.recordedAt)}{history.recordedBy ? ` by ${history.recordedBy}` : ''} · {patient.history.length} version{patient.history.length === 1 ? '' : 's'}</div>
            </dl>
          ) : <EmptyState title="No medical history recorded" />}
          {canEdit ? (
            <Collapsible summary="Record updated history">
              <ActionForm action={addMedicalHistoryAction.bind(null, patient.id)} className="grid gap-3 sm:grid-cols-2">
                <Field label="Diabetes type"><select name="diabetesType" defaultValue={history?.diabetesType ?? 'TYPE_2'} className={inputClass}><Options values={DIABETES_TYPE_OPTIONS} /></select></Field>
                <Field label="Diagnosed on"><input name="diabetesDiagnosedAt" type="date" max={today} defaultValue={history?.diabetesDiagnosedAt ?? ''} className={inputClass} /></Field>
                <Field label="Smoking"><select name="smokingStatus" defaultValue={history?.smokingStatus ?? 'NOT_RECORDED'} className={inputClass}><Options values={SMOKING_OPTIONS} /></select></Field>
                <Field label="Pregnancy"><select name="pregnancyStatus" defaultValue={history?.pregnancyStatus ?? 'NOT_RECORDED'} className={inputClass}><Options values={PREGNANCY_OPTIONS} /></select></Field>
                <Field label="Visual symptoms" wide><input name="visualSymptoms" defaultValue={history?.visualSymptoms ?? ''} placeholder="Blurred vision, floaters…" className={inputClass} /></Field>
                <Field label="Other conditions / notes" wide><textarea name="notes" rows={3} defaultValue={history?.notes ?? ''} placeholder="Hypertension, kidney disease, cardiac history…" className={inputClass} /></Field>
                <div className="sm:col-span-2"><SubmitButton>Save new version</SubmitButton></div>
              </ActionForm>
            </Collapsible>
          ) : null}
        </Card>

        {/* Medicines & allergies */}
        <Card title={<span id="medicines">Medicines & allergies</span>} description="Used to check diet and natural-remedy guidance for interactions." className="scroll-mt-24">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current medicines</h3>
          {activeMeds.length ? (
            <ul className="mt-2 divide-y divide-slate-800">
              {activeMeds.map((medication) => (
                <li key={medication.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0"><p className="text-sm text-slate-200">{medication.name}</p>{medication.instructions ? <p className="text-xs text-slate-500">{medication.instructions}</p> : null}</div>
                  {canEdit ? (
                    <form action={stopMedicationAction.bind(null, patient.id, medication.id)}>
                      <SubmitButton className="text-[11px] font-semibold text-slate-400 hover:text-rose-300" pendingText="…">Stop</SubmitButton>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-600">None recorded.</p>}
          {patient.medications.length > activeMeds.length ? (
            <p className="mt-2 text-[11px] text-slate-600">Past: {patient.medications.filter((m) => m.endedAt).map((m) => m.name).join(', ')}</p>
          ) : null}

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Allergies</h3>
          {patient.allergies.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {patient.allergies.map((allergy) => (
                <Badge key={allergy.id} tone={allergy.severity === 'SEVERE' ? 'rose' : 'amber'}>{allergy.substance}{allergy.reaction ? ` – ${allergy.reaction}` : ''}</Badge>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-slate-600">No known allergies recorded.</p>}

          {canEdit ? (
            <>
              <Collapsible summary="Add medicine">
                <ActionForm action={addMedicationAction.bind(null, patient.id)} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Medicine"><input name="name" placeholder="Metformin 500 mg" className={inputClass} required /></Field>
                  <Field label="Started"><input name="startedAt" type="date" max={today} className={inputClass} /></Field>
                  <Field label="Instructions" wide><input name="instructions" placeholder="Twice daily after meals" className={inputClass} /></Field>
                  <div className="sm:col-span-2"><SubmitButton>Add medicine</SubmitButton></div>
                </ActionForm>
              </Collapsible>
              <Collapsible summary="Add allergy">
                <ActionForm action={addAllergyAction.bind(null, patient.id)} className="grid gap-3 sm:grid-cols-3">
                  <Field label="Substance"><input name="substance" className={inputClass} required /></Field>
                  <Field label="Reaction"><input name="reaction" className={inputClass} /></Field>
                  <Field label="Severity"><select name="severity" className={inputClass}><option value="">Not recorded</option><option value="MILD">Mild</option><option value="MODERATE">Moderate</option><option value="SEVERE">Severe</option></select></Field>
                  <div className="sm:col-span-3"><SubmitButton>Add allergy</SubmitButton></div>
                </ActionForm>
              </Collapsible>
            </>
          ) : null}
        </Card>

        {/* Ocular history */}
        <Card title={<span id="ocular">Eye history</span>} description="Previous eye conditions, laser, injections or surgery." className="scroll-mt-24">
          {patient.ocularHistory.length ? (
            <ul className="divide-y divide-slate-800">
              {patient.ocularHistory.map((entry) => (
                <li key={entry.id} className="py-2">
                  <p className="text-sm text-slate-200">{entry.condition} {entry.eye ? <span className="text-xs text-slate-500">({humanizeEnum(entry.eye)} eye)</span> : null}</p>
                  <p className="text-xs text-slate-500">{[entry.surgeryOrTreatment, entry.occurredAt ? formatDate(entry.occurredAt) : null, entry.notes].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No eye history recorded" />}
          {canEdit ? (
            <Collapsible summary="Add eye history">
              <ActionForm action={addOcularHistoryAction.bind(null, patient.id)} className="grid gap-3 sm:grid-cols-2">
                <Field label="Condition"><input name="condition" placeholder="Cataract, glaucoma, DME…" className={inputClass} required /></Field>
                <Field label="Eye"><select name="eye" className={inputClass}><option value="">Both / not specified</option><option value="RIGHT">Right</option><option value="LEFT">Left</option></select></Field>
                <Field label="Treatment / surgery"><input name="surgeryOrTreatment" placeholder="PRP laser, anti-VEGF, phaco" className={inputClass} /></Field>
                <Field label="Date"><input name="occurredAt" type="date" max={today} className={inputClass} /></Field>
                <Field label="Notes" wide><input name="notes" className={inputClass} /></Field>
                <div className="sm:col-span-2"><SubmitButton>Add entry</SubmitButton></div>
              </ActionForm>
            </Collapsible>
          ) : null}
        </Card>

        {/* Follow-ups & referrals */}
        <Card title={<span id="care">Follow-ups & referrals</span>} className="scroll-mt-24">
          {patient.followUps.length ? (
            <ul className="divide-y divide-slate-800">
              {patient.followUps.map((followUp) => {
                const open = followUp.status === 'SCHEDULED' || followUp.status === 'DUE';
                const overdue = open && new Date(followUp.dueAt) < new Date();
                return (
                  <li key={followUp.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className={`text-sm ${overdue ? 'text-rose-300' : 'text-slate-200'}`}>{formatDate(followUp.dueAt)} {overdue ? '· overdue' : ''}</p>
                      <p className="text-xs text-slate-500">{humanizeEnum(followUp.status)}{followUp.notes ? ` · ${followUp.notes}` : ''}</p>
                    </div>
                    {open && canFollowUp ? (
                      <form action={followUpStatusAction.bind(null, followUp.id, 'COMPLETED')}>
                        <SubmitButton className="text-[11px] font-semibold text-emerald-300" pendingText="…">Mark done</SubmitButton>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-xs text-slate-600">No follow-ups scheduled.</p>}
          {patient.referrals.length ? (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Referrals</h3>
              <ul className="mt-2 space-y-2">
                {patient.referrals.map((referral) => (
                  <li key={referral.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2"><Badge tone={referral.urgency === 'URGENT' || referral.urgency === 'EMERGENCY' ? 'rose' : 'amber'}>{humanizeEnum(referral.urgency)}</Badge><span className="text-slate-500">{formatDate(referral.referredAt)}</span></div>
                    <p className="mt-2 text-slate-300">{referral.reason}</p>
                    {referral.destination ? <p className="text-slate-500">To: {referral.destination}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {canFollowUp ? (
            <Collapsible summary="Schedule follow-up">
              <ActionForm action={scheduleFollowUpAction.bind(null, patient.id, null)} className="grid gap-3 sm:grid-cols-2">
                <Field label="Due date"><input name="dueAt" type="date" min={today} className={inputClass} required /></Field>
                <Field label="Notes"><input name="notes" placeholder="Rescreening, HbA1c check" className={inputClass} /></Field>
                <div className="sm:col-span-2"><SubmitButton>Schedule</SubmitButton></div>
              </ActionForm>
            </Collapsible>
          ) : null}
        </Card>

        {/* Notes */}
        <Card title={<span id="notes">Clinician notes</span>} className="scroll-mt-24">
          {canEdit ? (
            <ActionForm action={addNoteAction.bind(null, patient.id)} className="grid gap-2">
              <textarea name="note" rows={3} placeholder="Add a note to the patient record…" className={inputClass} />
              <div><SubmitButton>Add note</SubmitButton></div>
            </ActionForm>
          ) : null}
          {patient.notes.length ? (
            <ul className="mt-4 space-y-3">
              {patient.notes.map((note) => (
                <li key={note.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <p className="whitespace-pre-line text-sm text-slate-300">{note.note}</p>
                  <p className="mt-1.5 text-[11px] text-slate-600">{note.author} · {formatDateTime(note.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-xs text-slate-600">No notes yet.</p>}
        </Card>

        {/* Consent */}
        <Card title={<span id="consent">Consent</span>} description="The latest record per purpose applies. History is kept." className="scroll-mt-24">
          <ul className="space-y-2">
            {(['IMAGE_PROCESSING', 'DATA_RETENTION', 'COMMUNICATIONS', 'RESEARCH'] as const).map((purpose) => {
              const latest = consentByPurpose.get(purpose);
              const granted = latest?.status === 'GRANTED' && !latest.revokedAt;
              return (
                <li key={purpose} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm text-slate-200">{humanizeEnum(purpose)}</p>
                    <p className="text-[11px] text-slate-600">{latest ? `${formatDateTime(latest.capturedAt)}${latest.capturedBy ? ` · ${latest.capturedBy}` : ''}` : 'Never recorded'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={granted ? 'emerald' : 'slate'}>{granted ? 'Granted' : latest ? 'Not granted' : 'None'}</Badge>
                    {canEdit ? (
                      <ActionForm action={consentAction.bind(null, patient.id)} className="contents">
                        <input type="hidden" name="purpose" value={purpose} />
                        <input type="hidden" name="decision" value={granted ? 'revoke' : 'grant'} />
                        <SubmitButton className="text-[11px] font-semibold text-cyan-300" pendingText="…">{granted ? 'Revoke' : 'Record consent'}</SubmitButton>
                      </ActionForm>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Demographics */}
        <Card title={<span id="details">Patient details</span>} className="scroll-mt-24">
          {canEdit && patient.demographics ? (
            <ActionForm action={updateDemographicsAction.bind(null, patient.id)} className="grid gap-3 sm:grid-cols-2">
              <Field label="Given name"><input name="givenName" defaultValue={patient.demographics.givenName} className={inputClass} /></Field>
              <Field label="Family name"><input name="familyName" defaultValue={patient.demographics.familyName} className={inputClass} /></Field>
              <Field label="Preferred name"><input name="preferredName" defaultValue={patient.demographics.preferredName ?? ''} className={inputClass} /></Field>
              <Field label="Preferred language"><input name="preferredLanguage" defaultValue={patient.demographics.preferredLanguage ?? ''} className={inputClass} /></Field>
              <Field label="Date of birth"><input name="dateOfBirth" type="date" max={today} defaultValue={patient.demographics.dateOfBirth ?? ''} className={inputClass} /></Field>
              <Field label="Sex at birth"><select name="sexAtBirth" defaultValue={patient.demographics.sexAtBirth} className={inputClass}><Options values={SEX_AT_BIRTH_OPTIONS} /></select></Field>
              <Field label="Mobile" wide><input name="phone" type="tel" defaultValue={patient.phone ?? ''} className={inputClass} /></Field>
              <div className="sm:col-span-2"><SubmitButton>Save details</SubmitButton></div>
            </ActionForm>
          ) : (
            <p className="text-sm text-slate-400">Registered {formatDate(patient.createdAt)}.</p>
          )}
          {canEdit ? (
            <div className="mt-5 border-t border-slate-800 pt-4">
              <form action={archivePatientAction.bind(null, patient.id, patient.status === 'ACTIVE')}>
                <SubmitButton className={patient.status === 'ACTIVE' ? dangerButton : secondaryButton} pendingText="…">
                  {patient.status === 'ACTIVE' ? 'Archive patient' : 'Restore patient'}
                </SubmitButton>
              </form>
              <p className="mt-2 text-[11px] text-slate-600">Archiving hides the patient from lists; records are retained.</p>
            </div>
          ) : null}
        </Card>
      </div>
    </Page>
  );
}
