'use server';

import { redirect } from 'next/navigation';
import { getCurrentActor } from '@/lib/auth/authorization';
import { AuthorizationError } from '@/lib/auth/policy';
import { createPatient, PatientNumberConflictError } from '@/data/patients';
import { patientCreateSchema, patientInputFromFormData } from '@/lib/patients/validation';

export interface PatientActionState {
  message?: string;
  errors?: Record<string, string[]>;
}

export async function createPatientAction(
  _previousState: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    return { message: 'Your session is missing or no longer active. Sign in again.' };
  }

  const parsed = patientCreateSchema.safeParse(patientInputFromFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createPatient(actor, parsed.data);
  } catch (error) {
    if (error instanceof PatientNumberConflictError || error instanceof AuthorizationError) {
      return { message: error.message };
    }
    console.error('[OpthaEdge] Patient creation failed without logging clinical form data.', error);
    return { message: 'The patient record could not be created.' };
  }

  redirect('/patients?created=1');
}

