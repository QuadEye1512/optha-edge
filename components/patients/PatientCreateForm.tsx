'use client';

import { useActionState } from 'react';
import { createPatientAction, type PatientActionState } from '@/app/patients/actions';
import { inputClass, labelClass, primaryButton } from '@/components/ui';
import { humanizeEnum } from '@/lib/format';
import { DIABETES_TYPE_OPTIONS, SEX_AT_BIRTH_OPTIONS } from '@/lib/patients/validation';

const initialState: PatientActionState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-xs text-rose-300">{errors[0]}</p> : null;
}

export default function PatientCreateForm() {
  const [state, action, pending] = useActionState(createPatientAction, initialState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className={labelClass}>
        Patient ID
        <input className={inputClass} name="patientNumber" autoComplete="off" placeholder="OPD-2026-0001" required />
        <FieldError errors={state.errors?.patientNumber} />
      </label>
      <label className={labelClass}>
        Mobile number
        <input className={inputClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" />
        <FieldError errors={state.errors?.phone} />
      </label>
      <label className={labelClass}>
        Given name
        <input className={inputClass} name="givenName" autoComplete="given-name" required />
        <FieldError errors={state.errors?.givenName} />
      </label>
      <label className={labelClass}>
        Family name
        <input className={inputClass} name="familyName" autoComplete="family-name" required />
        <FieldError errors={state.errors?.familyName} />
      </label>
      <label className={labelClass}>
        Date of birth
        <input className={inputClass} name="dateOfBirth" type="date" />
        <FieldError errors={state.errors?.dateOfBirth} />
      </label>
      <label className={labelClass}>
        Sex at birth
        <select className={inputClass} name="sexAtBirth" defaultValue="NOT_RECORDED">
          {SEX_AT_BIRTH_OPTIONS.map((option) => <option key={option} value={option}>{humanizeEnum(option)}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        Diabetes type
        <select className={inputClass} name="diabetesType" defaultValue="TYPE_2">
          {DIABETES_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{humanizeEnum(option)}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        Diabetes diagnosed on
        <input className={inputClass} name="diabetesDiagnosedAt" type="date" />
        <FieldError errors={state.errors?.diabetesDiagnosedAt} />
      </label>
      <label className={labelClass}>
        Preferred name
        <input className={inputClass} name="preferredName" />
      </label>
      <label className={labelClass}>
        Preferred language (for patient education)
        <input className={inputClass} name="preferredLanguage" list="language-options" placeholder="English" />
        <datalist id="language-options">
          {['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Urdu', 'Malayalam', 'Punjabi'].map((language) => (
            <option key={language} value={language} />
          ))}
        </datalist>
      </label>

      <fieldset className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:col-span-2">
        <legend className="px-1 text-xs font-semibold text-slate-300">Consent (explain and record)</legend>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
          <input className="mt-0.5 h-4 w-4 accent-cyan-500" type="checkbox" name="imageProcessingConsent" />
          The patient agrees to retinal photography and AI-assisted analysis. Screening stays blocked without this consent.
        </label>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
          <input className="mt-0.5 h-4 w-4 accent-cyan-500" type="checkbox" name="dataRetentionConsent" />
          The patient agrees that images and results are stored to track their eye health over time.
        </label>
      </fieldset>

      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? 'Creating record…' : 'Register patient'}
        </button>
        <p aria-live="polite" className="mt-3 text-xs text-amber-300">{state.message}</p>
      </div>
    </form>
  );
}
