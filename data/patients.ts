import 'server-only';

import {
  AuditOutcome,
  ConsentPurpose,
  ConsentStatus,
  type DiabetesType,
  type Laterality,
  type MeasurementType,
  PatientStatus,
  PredictionStatus,
  type PregnancyStatus,
  type SexAtBirth,
  type SmokingStatus,
} from '@/generated/prisma/client';
import { recordAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  AuthorizationError,
  hasPermission,
  requirePermission,
  type AuthorizationActor,
} from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';
import { DR_LABELS } from '@/lib/dr/grades';
import { MEASUREMENT_OPTIONS, type PatientCreateInput } from '@/lib/patients/validation';
import { CONSENT_POLICY_VERSION, hasActiveConsent } from './consent';

export class PatientNumberConflictError extends Error {
  constructor() {
    super('That patient ID is already in use for this organization.');
    this.name = 'PatientNumberConflictError';
  }
}

export class PatientNotFoundError extends Error {
  constructor() {
    super('Patient record not found.');
    this.name = 'PatientNotFoundError';
  }
}

function toDate(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function displayName(demographics: { givenName: string; familyName: string; preferredName: string | null } | null): string {
  return demographics
    ? `${demographics.preferredName || demographics.givenName} ${demographics.familyName}`
    : 'Demographics unavailable';
}

/** Throws unless the patient exists in the actor's organization. */
async function assertPatientInScope(actor: AuthorizationActor, patientId: string): Promise<void> {
  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!patient) {
    throw new PatientNotFoundError();
  }
}

/** Latest clinician-confirmed grade, otherwise the latest AI grade, for an examination. */
export function effectiveGrade(exam: {
  reviews: { confirmedGrade: number | null; signedAt: Date | null }[];
  predictions: { status: PredictionStatus; drGrade: string | null }[];
}): { grade: number | null; source: 'clinician' | 'ai' | 'ungradable' | 'none' } {
  const signed = exam.reviews.find((review) => review.signedAt);
  if (signed && signed.confirmedGrade !== null) {
    return { grade: signed.confirmedGrade, source: 'clinician' };
  }
  const prediction = exam.predictions[0];
  if (!prediction) return { grade: null, source: 'none' };
  if (prediction.status === PredictionStatus.REJECTED_UNGRADABLE) return { grade: null, source: 'ungradable' };
  const index = prediction.drGrade ? DR_LABELS.indexOf(prediction.drGrade) : -1;
  return index >= 0 ? { grade: index, source: 'ai' } : { grade: null, source: 'none' };
}

export const examGradeSelect = {
  reviews: { orderBy: { createdAt: 'desc' as const }, select: { confirmedGrade: true, signedAt: true } },
  predictions: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { status: true, drGrade: true } },
};

// ---------------------------------------------------------------------------
// List / search

export interface PatientListItemDTO {
  id: string;
  patientNumber: string;
  displayName: string;
  dateOfBirth: string | null;
  sexAtBirth: string;
  status: string;
  updatedAt: string;
  imageConsent: boolean;
  lastExam: { id: string; examinedAt: string; eye: string; grade: number | null; gradeSource: string } | null;
}

export async function listPatients(actor: AuthorizationActor, searchTerm = '', take = 50): Promise<PatientListItemDTO[]> {
  requirePermission(actor, PERMISSIONS.PATIENT_READ);
  const query = searchTerm.trim().slice(0, 100);

  const patients = await getPrisma().patient.findMany({
    where: {
      organizationId: actor.organizationId,
      status: { not: PatientStatus.ARCHIVED },
      ...(query
        ? {
            OR: [
              { patientNumber: { contains: query, mode: 'insensitive' as const } },
              { demographics: { givenName: { contains: query, mode: 'insensitive' as const } } },
              { demographics: { familyName: { contains: query, mode: 'insensitive' as const } } },
              { contacts: { some: { value: { contains: query } } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take,
    select: {
      id: true,
      patientNumber: true,
      status: true,
      updatedAt: true,
      demographics: { select: { givenName: true, familyName: true, preferredName: true, dateOfBirth: true, sexAtBirth: true } },
      consents: {
        where: { purpose: ConsentPurpose.IMAGE_PROCESSING },
        orderBy: { capturedAt: 'desc' },
        take: 1,
        select: { status: true, revokedAt: true, expiresAt: true },
      },
      examinations: {
        orderBy: { examinedAt: 'desc' },
        take: 1,
        select: { id: true, examinedAt: true, eye: true, ...examGradeSelect },
      },
    },
  });

  const now = new Date();
  return patients.map((patient) => {
    const consent = patient.consents[0];
    const exam = patient.examinations[0];
    const grade = exam ? effectiveGrade(exam) : null;
    return {
      id: patient.id,
      patientNumber: patient.patientNumber,
      displayName: displayName(patient.demographics),
      dateOfBirth: patient.demographics?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      sexAtBirth: patient.demographics?.sexAtBirth ?? 'NOT_RECORDED',
      status: patient.status,
      updatedAt: patient.updatedAt.toISOString(),
      imageConsent: Boolean(
        consent && consent.status === ConsentStatus.GRANTED && !consent.revokedAt && (!consent.expiresAt || consent.expiresAt > now),
      ),
      lastExam: exam && grade
        ? { id: exam.id, examinedAt: exam.examinedAt.toISOString(), eye: exam.eye, grade: grade.grade, gradeSource: grade.source }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Create

export async function createPatient(actor: AuthorizationActor, input: PatientCreateInput): Promise<{ id: string }> {
  if (!hasPermission(actor, PERMISSIONS.PATIENT_CREATE)) {
    await recordAudit(actor, { action: 'patient.create', resourceType: 'Patient', resourceId: 'not-created', outcome: AuditOutcome.DENIED });
    throw new AuthorizationError();
  }

  const prisma = getPrisma();
  const existing = await prisma.patient.findUnique({
    where: { organizationId_patientNumber: { organizationId: actor.organizationId, patientNumber: input.patientNumber } },
    select: { id: true },
  });
  if (existing) {
    throw new PatientNumberConflictError();
  }

  return prisma.$transaction(async (transaction) => {
    const patient = await transaction.patient.create({
      data: {
        organizationId: actor.organizationId,
        patientNumber: input.patientNumber,
        demographics: {
          create: {
            givenName: input.givenName,
            familyName: input.familyName,
            preferredName: input.preferredName || null,
            preferredLanguage: input.preferredLanguage || null,
            dateOfBirth: toDate(input.dateOfBirth),
            sexAtBirth: input.sexAtBirth as SexAtBirth,
          },
        },
        ...(input.phone ? { contacts: { create: { type: 'PHONE', value: input.phone, isPrimary: true } } } : {}),
        medicalHistories: {
          create: {
            diabetesType: input.diabetesType as DiabetesType,
            diabetesDiagnosedAt: toDate(input.diabetesDiagnosedAt),
            recordedByUserId: actor.userId,
          },
        },
      },
      select: { id: true },
    });

    const consents: ConsentPurpose[] = [];
    if (input.imageProcessingConsent) consents.push(ConsentPurpose.IMAGE_PROCESSING);
    if (input.dataRetentionConsent) consents.push(ConsentPurpose.DATA_RETENTION);
    if (consents.length > 0) {
      await transaction.consentRecord.createMany({
        data: consents.map((purpose) => ({
          organizationId: actor.organizationId,
          patientId: patient.id,
          purpose,
          status: ConsentStatus.GRANTED,
          policyVersion: CONSENT_POLICY_VERSION,
          capturedByUserId: actor.userId,
        })),
      });
    }

    await recordAudit(actor, {
      action: 'patient.create',
      resourceType: 'Patient',
      resourceId: patient.id,
      metadata: { consentPurposes: consents },
    }, transaction);

    return patient;
  });
}

// ---------------------------------------------------------------------------
// Detail

export async function getPatientDetail(actor: AuthorizationActor, patientId: string) {
  requirePermission(actor, PERMISSIONS.PATIENT_READ);
  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, organizationId: actor.organizationId },
    include: {
      demographics: true,
      contacts: { orderBy: { isPrimary: 'desc' } },
      consents: { orderBy: { capturedAt: 'desc' }, include: { capturedBy: { select: { displayName: true } } } },
      medicalHistories: { orderBy: { recordedAt: 'desc' }, include: { recordedBy: { select: { displayName: true } } } },
      measurements: { orderBy: { observedAt: 'desc' }, take: 60 },
      medications: { orderBy: [{ endedAt: 'asc' }, { startedAt: 'desc' }] },
      allergies: { orderBy: { recordedAt: 'desc' } },
      ocularHistories: { orderBy: { occurredAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { displayName: true } } } },
      examinations: {
        orderBy: { examinedAt: 'desc' },
        include: {
          ...examGradeSelect,
          predictions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, drGrade: true, confidence: true } },
          createdBy: { select: { displayName: true } },
        },
      },
      followUps: { orderBy: { dueAt: 'asc' } },
      referrals: { orderBy: { referredAt: 'desc' } },
    },
  });
  if (!patient) {
    return null;
  }

  await recordAudit(actor, { action: 'patient.view', resourceType: 'Patient', resourceId: patient.id });

  const imageConsent = await hasActiveConsent(actor.organizationId, patient.id, ConsentPurpose.IMAGE_PROCESSING);
  const latestByType = new Map<string, (typeof patient.measurements)[number]>();
  for (const measurement of patient.measurements) {
    if (!latestByType.has(measurement.type)) latestByType.set(measurement.type, measurement);
  }

  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    status: patient.status,
    createdAt: patient.createdAt.toISOString(),
    displayName: displayName(patient.demographics),
    demographics: patient.demographics
      ? {
          givenName: patient.demographics.givenName,
          familyName: patient.demographics.familyName,
          preferredName: patient.demographics.preferredName,
          preferredLanguage: patient.demographics.preferredLanguage,
          dateOfBirth: patient.demographics.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          sexAtBirth: patient.demographics.sexAtBirth,
        }
      : null,
    phone: patient.contacts.find((contact) => contact.type === 'PHONE')?.value ?? null,
    imageConsent,
    consents: patient.consents.map((consent) => ({
      id: consent.id,
      purpose: consent.purpose,
      status: consent.status,
      capturedAt: consent.capturedAt.toISOString(),
      revokedAt: consent.revokedAt?.toISOString() ?? null,
      capturedBy: consent.capturedBy?.displayName ?? null,
      policyVersion: consent.policyVersion,
    })),
    history: patient.medicalHistories.map((history) => ({
      id: history.id,
      diabetesType: history.diabetesType,
      diabetesDiagnosedAt: history.diabetesDiagnosedAt?.toISOString().slice(0, 10) ?? null,
      pregnancyStatus: history.pregnancyStatus,
      smokingStatus: history.smokingStatus,
      visualSymptoms: history.visualSymptoms,
      notes: history.notes,
      recordedAt: history.recordedAt.toISOString(),
      recordedBy: history.recordedBy?.displayName ?? null,
    })),
    measurements: patient.measurements.map((measurement) => ({
      id: measurement.id,
      type: measurement.type,
      label: MEASUREMENT_OPTIONS.find((option) => option.type === measurement.type)?.label ?? measurement.type,
      value: measurement.value.toNumber(),
      unit: measurement.unit,
      observedAt: measurement.observedAt.toISOString(),
      source: measurement.source,
    })),
    latestMeasurements: [...latestByType.values()].map((measurement) => ({
      type: measurement.type,
      label: MEASUREMENT_OPTIONS.find((option) => option.type === measurement.type)?.label ?? measurement.type,
      value: measurement.value.toNumber(),
      unit: measurement.unit,
      observedAt: measurement.observedAt.toISOString(),
    })),
    medications: patient.medications.map((medication) => ({
      id: medication.id,
      name: medication.name,
      instructions: medication.instructions,
      startedAt: medication.startedAt?.toISOString().slice(0, 10) ?? null,
      endedAt: medication.endedAt?.toISOString().slice(0, 10) ?? null,
    })),
    allergies: patient.allergies.map((allergy) => ({
      id: allergy.id,
      substance: allergy.substance,
      reaction: allergy.reaction,
      severity: allergy.severity,
    })),
    ocularHistory: patient.ocularHistories.map((entry) => ({
      id: entry.id,
      eye: entry.eye,
      condition: entry.condition,
      surgeryOrTreatment: entry.surgeryOrTreatment,
      occurredAt: entry.occurredAt?.toISOString().slice(0, 10) ?? null,
      notes: entry.notes,
    })),
    notes: patient.notes.map((note) => ({
      id: note.id,
      note: note.note,
      author: note.author.displayName,
      createdAt: note.createdAt.toISOString(),
    })),
    examinations: patient.examinations.map((exam) => {
      const grade = effectiveGrade(exam);
      return {
        id: exam.id,
        eye: exam.eye,
        status: exam.status,
        examinedAt: exam.examinedAt.toISOString(),
        imageSource: exam.imageSource,
        createdBy: exam.createdBy.displayName,
        grade: grade.grade,
        gradeSource: grade.source,
        aiConfidence: exam.predictions[0]?.confidence?.toNumber() ?? null,
      };
    }),
    followUps: patient.followUps.map((followUp) => ({
      id: followUp.id,
      status: followUp.status,
      dueAt: followUp.dueAt.toISOString(),
      completedAt: followUp.completedAt?.toISOString() ?? null,
      notes: followUp.notes,
    })),
    referrals: patient.referrals.map((referral) => ({
      id: referral.id,
      urgency: referral.urgency,
      status: referral.status,
      reason: referral.reason,
      destination: referral.destination,
      referredAt: referral.referredAt.toISOString(),
    })),
  };
}

export type PatientDetailDTO = NonNullable<Awaited<ReturnType<typeof getPatientDetail>>>;

// ---------------------------------------------------------------------------
// Updates (each one audited, organization-scoped)

export async function updateDemographics(
  actor: AuthorizationActor,
  patientId: string,
  input: { givenName: string; familyName: string; preferredName: string; preferredLanguage: string; dateOfBirth: string; sexAtBirth: string; phone: string },
): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const data = {
      givenName: input.givenName,
      familyName: input.familyName,
      preferredName: input.preferredName || null,
      preferredLanguage: input.preferredLanguage || null,
      dateOfBirth: toDate(input.dateOfBirth),
      sexAtBirth: input.sexAtBirth as SexAtBirth,
    };
    await transaction.patientDemographics.upsert({ where: { patientId }, update: data, create: { patientId, ...data } });
    const phone = await transaction.patientContact.findFirst({ where: { patientId, type: 'PHONE' } });
    if (input.phone && phone) {
      await transaction.patientContact.update({ where: { id: phone.id }, data: { value: input.phone } });
    } else if (input.phone) {
      await transaction.patientContact.create({ data: { patientId, type: 'PHONE', value: input.phone, isPrimary: true } });
    } else if (phone) {
      await transaction.patientContact.delete({ where: { id: phone.id } });
    }
    await transaction.patient.update({ where: { id: patientId }, data: { updatedAt: new Date() } });
    await recordAudit(actor, { action: 'patient.demographics.update', resourceType: 'Patient', resourceId: patientId }, transaction);
  });
}

export async function addMedicalHistory(
  actor: AuthorizationActor,
  patientId: string,
  input: { diabetesType: string; diabetesDiagnosedAt: string; pregnancyStatus: string; smokingStatus: string; visualSymptoms: string; notes: string },
): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const history = await transaction.medicalHistory.create({
      data: {
        patientId,
        diabetesType: input.diabetesType as DiabetesType,
        diabetesDiagnosedAt: toDate(input.diabetesDiagnosedAt),
        pregnancyStatus: input.pregnancyStatus as PregnancyStatus,
        smokingStatus: input.smokingStatus as SmokingStatus,
        visualSymptoms: input.visualSymptoms || null,
        notes: input.notes || null,
        recordedByUserId: actor.userId,
      },
    });
    await transaction.patient.update({ where: { id: patientId }, data: { updatedAt: new Date() } });
    await recordAudit(actor, { action: 'patient.history.record', resourceType: 'MedicalHistory', resourceId: history.id }, transaction);
  });
}

export async function addMeasurement(
  actor: AuthorizationActor,
  patientId: string,
  input: { type: string; value: number; observedAt: string; source: string },
): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const unit = MEASUREMENT_OPTIONS.find((option) => option.type === input.type)?.unit ?? '';
  const measurement = await getPrisma().clinicalMeasurement.create({
    data: {
      organizationId: actor.organizationId,
      patientId,
      type: input.type as MeasurementType,
      value: input.value,
      unit,
      observedAt: toDate(input.observedAt) ?? new Date(),
      source: input.source || null,
      recordedByUserId: actor.userId,
    },
  });
  await recordAudit(actor, { action: 'patient.measurement.record', resourceType: 'ClinicalMeasurement', resourceId: measurement.id, metadata: { type: input.type } });
}

export async function addMedication(actor: AuthorizationActor, patientId: string, input: { name: string; instructions: string; startedAt: string }): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const medication = await getPrisma().medication.create({
    data: { patientId, name: input.name, instructions: input.instructions || null, startedAt: toDate(input.startedAt) },
  });
  await recordAudit(actor, { action: 'patient.medication.add', resourceType: 'Medication', resourceId: medication.id });
}

export async function stopMedication(actor: AuthorizationActor, patientId: string, medicationId: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const result = await getPrisma().medication.updateMany({
    where: { id: medicationId, patientId, endedAt: null },
    data: { endedAt: new Date() },
  });
  if (result.count) {
    await recordAudit(actor, { action: 'patient.medication.stop', resourceType: 'Medication', resourceId: medicationId });
  }
}

export async function addAllergy(actor: AuthorizationActor, patientId: string, input: { substance: string; reaction: string; severity: string }): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const allergy = await getPrisma().allergy.create({
    data: { patientId, substance: input.substance, reaction: input.reaction || null, severity: input.severity || null },
  });
  await recordAudit(actor, { action: 'patient.allergy.add', resourceType: 'Allergy', resourceId: allergy.id });
}

export async function addOcularHistory(
  actor: AuthorizationActor,
  patientId: string,
  input: { eye: string; condition: string; surgeryOrTreatment: string; occurredAt: string; notes: string },
): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const entry = await getPrisma().ocularHistory.create({
    data: {
      patientId,
      eye: (input.eye || null) as Laterality | null,
      condition: input.condition,
      surgeryOrTreatment: input.surgeryOrTreatment || null,
      occurredAt: toDate(input.occurredAt),
      notes: input.notes || null,
    },
  });
  await recordAudit(actor, { action: 'patient.ocular_history.add', resourceType: 'OcularHistory', resourceId: entry.id });
}

export async function addClinicianNote(actor: AuthorizationActor, patientId: string, note: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const created = await getPrisma().clinicianNote.create({ data: { patientId, authorId: actor.userId, note } });
  await recordAudit(actor, { action: 'patient.note.add', resourceType: 'ClinicianNote', resourceId: created.id });
}

export async function recordConsent(
  actor: AuthorizationActor,
  patientId: string,
  purpose: ConsentPurpose,
  granted: boolean,
): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    if (!granted) {
      await transaction.consentRecord.updateMany({
        where: { organizationId: actor.organizationId, patientId, purpose, status: ConsentStatus.GRANTED, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    const record = await transaction.consentRecord.create({
      data: {
        organizationId: actor.organizationId,
        patientId,
        purpose,
        status: granted ? ConsentStatus.GRANTED : ConsentStatus.REVOKED,
        revokedAt: granted ? null : new Date(),
        policyVersion: CONSENT_POLICY_VERSION,
        capturedByUserId: actor.userId,
      },
    });
    await recordAudit(actor, {
      action: granted ? 'patient.consent.grant' : 'patient.consent.revoke',
      resourceType: 'ConsentRecord',
      resourceId: record.id,
      metadata: { purpose },
    }, transaction);
  });
}

export async function setPatientArchived(actor: AuthorizationActor, patientId: string, archived: boolean): Promise<void> {
  requirePermission(actor, PERMISSIONS.PATIENT_UPDATE);
  await assertPatientInScope(actor, patientId);
  await getPrisma().patient.update({
    where: { id: patientId },
    data: archived ? { status: PatientStatus.ARCHIVED, archivedAt: new Date() } : { status: PatientStatus.ACTIVE, archivedAt: null },
  });
  await recordAudit(actor, { action: archived ? 'patient.archive' : 'patient.restore', resourceType: 'Patient', resourceId: patientId });
}

/** Minimal header data for the screening page. */
export async function getPatientSummary(actor: AuthorizationActor, patientId: string) {
  requirePermission(actor, PERMISSIONS.PATIENT_READ);
  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, organizationId: actor.organizationId, status: PatientStatus.ACTIVE },
    select: {
      id: true,
      patientNumber: true,
      demographics: { select: { givenName: true, familyName: true, preferredName: true, dateOfBirth: true, sexAtBirth: true } },
    },
  });
  if (!patient) return null;
  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    displayName: displayName(patient.demographics),
    dateOfBirth: patient.demographics?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    sexAtBirth: patient.demographics?.sexAtBirth ?? 'NOT_RECORDED',
    imageConsent: await hasActiveConsent(actor.organizationId, patient.id, ConsentPurpose.IMAGE_PROCESSING),
  };
}
