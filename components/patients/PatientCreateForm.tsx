'use client';

import { useActionState } from 'react';
import { createPatientAction, type PatientActionState } from '@/app/patients/actions';
import { SEX_AT_BIRTH_OPTIONS } from '@/lib/patients/validation';

const initialState: PatientActionState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-xs text-rose-300">{errors[0]}</p> : null;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15';

export default function PatientCreateForm() {
  const [state, action, pending] = useActionState(createPatientAction, initialState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="text-xs font-medium text-slate-400">
        Patient ID
        <input className={inputClass} name="patientNumber" autoComplete="off" placeholder="CLINIC-0002" required />
        <FieldError errors={state.errors?.patientNumber} />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Preferred language
        <input className={inputClass} name="preferredLanguage" autoComplete="language" placeholder="English" />
        <FieldError errors={state.errors?.preferredLanguage} />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Given name
        <input className={inputClass} name="givenName" autoComplete="given-name" required />
        <FieldError errors={state.errors?.givenName} />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Family name
        <input className={inputClass} name="familyName" autoComplete="family-name" required />
        <FieldError errors={state.errors?.familyName} />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Preferred name
        <input className={inputClass} name="preferredName" autoComplete="nickname" />
        <FieldError errors={state.errors?.preferredName} />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Date of birth
        <input className={inputClass} name="dateOfBirth" type="date" autoComplete="bday" />
        <FieldError errors={state.errors?.dateOfBirth} />
      </label>
      <label className="text-xs font-medium text-slate-400 sm:col-span-2">
        Biological sex where clinically relevant
        <select className={inputClass} name="sexAtBirth" defaultValue="NOT_RECORDED">
          {SEX_AT_BIRTH_OPTIONS.map((option) => (
            <option key={option} value={option}>{option.replaceAll('_', ' ').toLowerCase()}</option>
          ))}
        </select>
        <FieldError errors={state.errors?.sexAtBirth} />
      </label>

      <fieldset className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:col-span-2">
        <legend className="px-1 text-xs font-semibold text-slate-300">Synthetic development consent record</legend>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
          <input className="mt-0.5 h-4 w-4 accent-cyan-500" type="checkbox" name="imageProcessingConsent" />
          Record consent for retinal-image processing. Screening must remain unavailable when this consent is absent.
        </label>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
          <input className="mt-0.5 h-4 w-4 accent-cyan-500" type="checkbox" name="dataRetentionConsent" />
          Record consent for development data retention under the synthetic policy version.
        </label>
      </fieldset>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? 'Creating record…' : 'Create synthetic patient'}
        </button>
        <p aria-live="polite" className="mt-3 text-xs text-amber-300">{state.message}</p>
      </div>
    </form>
  );
}

