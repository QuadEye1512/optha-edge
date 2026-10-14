import 'server-only';

import {
  AuditOutcome,
  ConsentPurpose,
  ConsentStatus,
  PatientStatus,
  type SexAtBirth,
} from '@/generated/prisma/client';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  AuthorizationError,
  hasPermission,
  requirePermission,
  type AuthorizationActor,
} from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';
import type { PatientCreateInput } from '@/lib/patients/validation';

export interface PatientListItemDTO {
  id: string;
  patientNumber: string;
  displayName: string;
  dateOfBirth: string | null;
  sexAtBirth: string;
  status: string;
  updatedAt: string;
}

export class PatientNumberConflictError extends Error {
  constructor() {
    super('That patient ID is already in use for this organization.');
    this.name = 'PatientNumberConflictError';
  }
}

async function recordDeniedCreate(actor: AuthorizationActor): Promise<void> {
  await getPrisma().auditEvent.create({
    data: {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: 'patient.create',
      resourceType: 'Patient',
      resourceId: 'not-created',
      outcome: AuditOutcome.DENIED,
    },
  });
}

export async function listPatients(
  actor: AuthorizationActor,
  searchTerm = '',
): Promise<PatientListItemDTO[]> {
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
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      patientNumber: true,
      status: true,
      updatedAt: true,
      demographics: {
        select: {
          givenName: true,
          familyName: true,
          preferredName: true,
          dateOfBirth: true,
          sexAtBirth: true,
        },
      },
    },
  });

  return patients.map((patient) => ({
    id: patient.id,
    patientNumber: patient.patientNumber,
    displayName: patient.demographics
      ? `${patient.demographics.preferredName || patient.demographics.givenName} ${patient.demographics.familyName}`
      : 'Demographics unavailable',
    dateOfBirth: patient.demographics?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    sexAtBirth: patient.demographics?.sexAtBirth ?? 'NOT_RECORDED',
    status: patient.status,
    updatedAt: patient.updatedAt.toISOString(),
  }));
}

export async function createPatient(
  actor: AuthorizationActor,
  input: PatientCreateInput,
): Promise<{ id: string }> {
  if (!hasPermission(actor, PERMISSIONS.PATIENT_CREATE)) {
    await recordDeniedCreate(actor);
    throw new AuthorizationError();
  }

  const prisma = getPrisma();
  const existing = await prisma.patient.findUnique({
    where: {
      organizationId_patientNumber: {
        organizationId: actor.organizationId,
        patientNumber: input.patientNumber,
      },
    },
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
            dateOfBirth: input.dateOfBirth
              ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
              : null,
            sexAtBirth: input.sexAtBirth as SexAtBirth,
          },
        },
      },
      select: { id: true },
    });

    const consents: ConsentPurpose[] = [];
    if (input.imageProcessingConsent) {
      consents.push(ConsentPurpose.IMAGE_PROCESSING);
    }
    if (input.dataRetentionConsent) {
      consents.push(ConsentPurpose.DATA_RETENTION);
    }

    if (consents.length > 0) {
      await transaction.consentRecord.createMany({
        data: consents.map((purpose) => ({
          organizationId: actor.organizationId,
          patientId: patient.id,
          purpose,
          status: ConsentStatus.GRANTED,
          policyVersion: 'synthetic-development-v1',
          capturedByUserId: actor.userId,
        })),
      });
    }

    await transaction.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'patient.create',
        resourceType: 'Patient',
        resourceId: patient.id,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          consentPurposes: consents,
          syntheticDevelopment: true,
        },
      },
    });

    return patient;
  });
}
