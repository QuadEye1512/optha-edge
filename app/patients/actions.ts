'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ConsentPurpose } from '@/generated/prisma/client';
import { scheduleFollowUp, setFollowUpStatus } from '@/data/followUps';
import {
  addAllergy,
  addClinicianNote,
  addMeasurement,
  addMedicalHistory,
  addMedication,
  addOcularHistory,
  createPatient,
  recordConsent,
  setPatientArchived,
  stopMedication,
  updateDemographics,
} from '@/data/patients';
import { getCurrentActor } from '@/lib/auth/authorization';
import { errorState, failure, success, validationFailure, type FormState } from '@/lib/formState';
import {
  allergySchema,
  demographicsUpdateSchema,
  formToObject,
  measurementSchema,
  medicalHistorySchema,
  medicationSchema,
  noteSchema,
  ocularHistorySchema,
  patientCreateSchema,
  patientInputFromFormData,
} from '@/lib/patients/validation';

export interface PatientActionState {
  message?: string;
  errors?: Record<string, string[]>;
}

const SESSION_EXPIRED = 'Your session is missing or no longer active. Sign in again.';

export async function createPatientAction(_previousState: PatientActionState, formData: FormData): Promise<PatientActionState> {
  const actor = await getCurrentActor();
  if (!actor) return { message: SESSION_EXPIRED };

  const parsed = patientCreateSchema.safeParse(patientInputFromFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let id: string;
  try {
    ({ id } = await createPatient(actor, parsed.data));
  } catch (error) {
    return { message: errorState(error, 'The patient record could not be created.').message };
  }
  redirect(`/patients/${id}?created=1`);
}

async function withActor(patientId: string, work: (actor: NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>) => Promise<string>): Promise<FormState> {
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  try {
    const message = await work(actor);
    revalidatePath(`/patients/${patientId}`);
    return success(message);
  } catch (error) {
    return errorState(error);
  }
}

export async function updateDemographicsAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = demographicsUpdateSchema.safeParse(
    formToObject(formData, ['givenName', 'familyName', 'preferredName', 'preferredLanguage', 'dateOfBirth', 'sexAtBirth', 'phone']),
  );
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await updateDemographics(actor, patientId, parsed.data);
    return 'Demographics updated.';
  });
}

export async function addMedicalHistoryAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = medicalHistorySchema.safeParse(
    formToObject(formData, ['diabetesType', 'diabetesDiagnosedAt', 'pregnancyStatus', 'smokingStatus', 'visualSymptoms', 'notes']),
  );
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await addMedicalHistory(actor, patientId, parsed.data);
    return 'Medical history recorded as a new version.';
  });
}

export async function addMeasurementAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = measurementSchema.safeParse(formToObject(formData, ['type', 'value', 'observedAt', 'source']));
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await addMeasurement(actor, patientId, parsed.data);
    return 'Measurement recorded.';
  });
}

export async function addMedicationAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = medicationSchema.safeParse(formToObject(formData, ['name', 'instructions', 'startedAt']));
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await addMedication(actor, patientId, parsed.data);
    return 'Medicine added.';
  });
}

export async function stopMedicationAction(patientId: string, medicationId: string): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  await stopMedication(actor, patientId, medicationId);
  revalidatePath(`/patients/${patientId}`);
}

export async function addAllergyAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = allergySchema.safeParse(formToObject(formData, ['substance', 'reaction', 'severity']));
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await addAllergy(actor, patientId, parsed.data);
    return 'Allergy recorded.';
  });
}

export async function addOcularHistoryAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = ocularHistorySchema.safeParse(formToObject(formData, ['eye', 'condition', 'surgeryOrTreatment', 'occurredAt', 'notes']));
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await addOcularHistory(actor, patientId, parsed.data);
    return 'Eye history recorded.';
  });
}

export async function addNoteAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const parsed = noteSchema.safeParse(formToObject(formData, ['note']));
  if (!parsed.success) return validationFailure(parsed.error);
  return withActor(patientId, async (actor) => {
    await addClinicianNote(actor, patientId, parsed.data.note);
    return 'Note added.';
  });
}

const CONSENT_PURPOSES: Record<string, ConsentPurpose> = {
  IMAGE_PROCESSING: ConsentPurpose.IMAGE_PROCESSING,
  DATA_RETENTION: ConsentPurpose.DATA_RETENTION,
  COMMUNICATIONS: ConsentPurpose.COMMUNICATIONS,
  RESEARCH: ConsentPurpose.RESEARCH,
};

export async function consentAction(patientId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const purpose = CONSENT_PURPOSES[String(formData.get('purpose'))];
  const decision = String(formData.get('decision'));
  if (!purpose || (decision !== 'grant' && decision !== 'revoke')) return failure('Choose a consent purpose and decision.');
  return withActor(patientId, async (actor) => {
    await recordConsent(actor, patientId, purpose, decision === 'grant');
    return decision === 'grant' ? 'Consent recorded.' : 'Consent revoked.';
  });
}

export async function archivePatientAction(patientId: string, archived: boolean): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  await setPatientArchived(actor, patientId, archived);
  revalidatePath(`/patients/${patientId}`);
  if (archived) redirect('/patients');
}

export async function scheduleFollowUpAction(patientId: string, examinationId: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  const dueAt = String(formData.get('dueAt') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return failure('Choose a follow-up date.');
  const notes = String(formData.get('notes') ?? '').trim().slice(0, 500);
  const result = await withActor(patientId, async (actor) => {
    await scheduleFollowUp(actor, { patientId, examinationId, dueAt, notes });
    return 'Follow-up scheduled.';
  });
  if (examinationId) revalidatePath(`/examinations/${examinationId}`);
  revalidatePath('/follow-ups');
  return result;
}

export async function followUpStatusAction(followUpId: string, status: 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SCHEDULED'): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  const patientId = await setFollowUpStatus(actor, followUpId, status);
  revalidatePath('/follow-ups');
  revalidatePath(`/patients/${patientId}`);
}
