'use client';

import { useActionState, useState } from 'react';
import { signReviewAction } from '@/app/examinations/actions';
import { SubmitButton } from '@/components/forms';
import { inputClass, labelClass } from '@/components/ui';
import { DR_GRADES } from '@/lib/dr/grades';
import type { FormState } from '@/lib/formState';

type Decision = 'AGREE' | 'DISAGREE' | 'INDETERMINATE' | 'REPEAT_IMAGING';

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ReviewForm({ examinationId, aiGrade }: { examinationId: string; aiGrade: number | null }) {
  const [state, action] = useActionState(signReviewAction.bind(null, examinationId), {} as FormState);
  const [decision, setDecision] = useState<Decision>(aiGrade === null ? 'REPEAT_IMAGING' : 'AGREE');
  const [grade, setGrade] = useState<number | null>(aiGrade);
  const effective = decision === 'AGREE' ? aiGrade : decision === 'DISAGREE' ? grade : null;
  const info = effective !== null ? DR_GRADES[effective] : null;
  const [urgency, setUrgency] = useState<string>(info?.suggestedUrgency ?? 'NOT_APPLICABLE');
  const [followUp, setFollowUp] = useState<string>(info ? addDays(info.suggestedFollowUpDays) : addDays(30));

  function applySuggestion(next: number | null) {
    const suggestion = next !== null ? DR_GRADES[next] : null;
    setUrgency(suggestion ? (suggestion.referable ? suggestion.suggestedUrgency : 'NOT_APPLICABLE') : 'NOT_APPLICABLE');
    setFollowUp(suggestion ? addDays(suggestion.suggestedFollowUpDays) : addDays(30));
  }

  if (state.ok) {
    return <p className="text-sm text-emerald-300">{state.message}</p>;
  }

  return (
    <form action={action} className="grid gap-4">
      <fieldset>
        <legend className={labelClass}>Your decision</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([
            ['AGREE', 'Agree with AI', aiGrade === null],
            ['DISAGREE', 'Override grade', false],
            ['REPEAT_IMAGING', 'Repeat imaging', false],
            ['INDETERMINATE', 'Indeterminate', false],
          ] as const).map(([value, label, disabled]) => (
            <label key={value} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${decision === value ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 bg-slate-950/40 text-slate-400'} ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
              <input
                type="radio"
                name="decision"
                value={value}
                checked={decision === value}
                disabled={disabled}
                onChange={() => {
                  setDecision(value);
                  applySuggestion(value === 'AGREE' ? aiGrade : value === 'DISAGREE' ? grade : null);
                }}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {decision === 'DISAGREE' ? (
        <label className={labelClass}>
          Clinician grade
          <select
            name="confirmedGrade"
            className={inputClass}
            value={grade ?? ''}
            onChange={(event) => {
              const next = event.target.value === '' ? null : Number(event.target.value);
              setGrade(next);
              applySuggestion(next);
            }}
          >
            <option value="">Select grade</option>
            {DR_GRADES.map((g) => <option key={g.index} value={g.index}>{g.index} · {g.clinicalName}</option>)}
          </select>
        </label>
      ) : (
        <input type="hidden" name="confirmedGrade" value="" />
      )}

      {info ? <p className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-400">Suggested: {info.suggestedFollowUpText}</p> : null}

      {decision === 'REPEAT_IMAGING' ? (
        <label className={labelClass}>
          Reason for repeat imaging
          <input name="repeatImagingReason" className={inputClass} placeholder="Media opacity, small pupil, poor focus…" />
        </label>
      ) : <input type="hidden" name="repeatImagingReason" value="" />}

      <label className={labelClass}>
        Clinical assessment
        <textarea name="assessment" rows={3} className={inputClass} placeholder="Findings seen on the original image, macular involvement, comparison with previous visits…" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Referral
          <select name="referralUrgency" value={urgency} onChange={(event) => setUrgency(event.target.value)} className={inputClass}>
            <option value="NOT_APPLICABLE">No referral</option>
            <option value="ROUTINE">Routine referral</option>
            <option value="SOON">Soon (within weeks)</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency (same day)</option>
          </select>
        </label>
        <label className={labelClass}>
          Next screening / follow-up
          <input type="date" name="followUpDate" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className={inputClass} />
        </label>
      </div>
      {urgency !== 'NOT_APPLICABLE' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Refer to<input name="referralDestination" className={inputClass} placeholder="Retina clinic, hospital" /></label>
          <label className={labelClass}>Referral reason<input name="referralReason" className={inputClass} defaultValue={info?.suggestedFollowUpText ?? ''} /></label>
        </div>
      ) : (
        <>
          <input type="hidden" name="referralDestination" value="" />
          <input type="hidden" name="referralReason" value="" />
        </>
      )}

      <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
        <input type="checkbox" name="attest" className="mt-0.5 h-4 w-4 accent-cyan-500" />
        I reviewed the original retinal image myself. This signed review is final and can only be amended, not edited.
      </label>

      <div>
        <SubmitButton pendingText="Signing…">Sign review</SubmitButton>
        {state.message ? <p aria-live="polite" className="mt-2 text-xs text-amber-300">{state.message}</p> : null}
      </div>
    </form>
  );
}
