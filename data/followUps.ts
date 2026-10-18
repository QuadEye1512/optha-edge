import 'server-only';

import { FollowUpStatus, PatientStatus } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { requirePermission, type AuthorizationActor } from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';
import { WorkflowError } from './examinations';

export async function listFollowUps(actor: AuthorizationActor, view: 'open' | 'overdue' | 'completed' = 'open') {
  requirePermission(actor, PERMISSIONS.PATIENT_READ);
  const now = new Date();
  const rows = await getPrisma().followUp.findMany({
    where: {
      organizationId: actor.organizationId,
      patient: { status: { not: PatientStatus.ARCHIVED } },
      ...(view === 'completed'
        ? { status: { in: [FollowUpStatus.COMPLETED, FollowUpStatus.MISSED, FollowUpStatus.CANCELLED] } }
        : { status: { in: [FollowUpStatus.SCHEDULED, FollowUpStatus.DUE] }, ...(view === 'overdue' ? { dueAt: { lt: now } } : {}) }),
    },
    orderBy: view === 'completed' ? { completedAt: 'desc' } : { dueAt: 'asc' },
    take: 200,
    include: {
      patient: {
        select: {
          id: true,
          patientNumber: true,
          demographics: { select: { givenName: true, familyName: true, preferredName: true } },
          contacts: { where: { type: 'PHONE' }, take: 1, select: { value: true } },
        },
      },
      examination: { select: { id: true, eye: true, examinedAt: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    dueAt: row.dueAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    overdue: row.dueAt < now && (row.status === FollowUpStatus.SCHEDULED || row.status === FollowUpStatus.DUE),
    notes: row.notes,
    patientId: row.patient.id,
    patientNumber: row.patient.patientNumber,
    patientName: row.patient.demographics
      ? `${row.patient.demographics.preferredName || row.patient.demographics.givenName} ${row.patient.demographics.familyName}`
      : 'Unknown',
    phone: row.patient.contacts[0]?.value ?? null,
    examination: row.examination ? { id: row.examination.id, eye: row.examination.eye, examinedAt: row.examination.examinedAt.toISOString() } : null,
  }));
}

export async function scheduleFollowUp(
  actor: AuthorizationActor,
  input: { patientId: string; examinationId: string | null; dueAt: string; notes: string },
): Promise<void> {
  requirePermission(actor, PERMISSIONS.FOLLOWUP_MANAGE);
  const prisma = getPrisma();
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, organizationId: actor.organizationId }, select: { id: true } });
  if (!patient) throw new WorkflowError('Patient not found.');
  if (input.examinationId) {
    const exam = await prisma.examination.findFirst({
      where: { id: input.examinationId, organizationId: actor.organizationId, patientId: input.patientId },
      select: { id: true },
    });
    if (!exam) throw new WorkflowError('Examination not found.');
  }
  const followUp = await prisma.followUp.create({
    data: {
      organizationId: actor.organizationId,
      patientId: input.patientId,
      examinationId: input.examinationId,
      dueAt: new Date(`${input.dueAt}T09:00:00.000Z`),
      notes: input.notes || 'Retinal rescreening',
    },
    select: { id: true },
  });
  await recordAudit(actor, { action: 'followup.schedule', resourceType: 'FollowUp', resourceId: followUp.id });
}

export async function setFollowUpStatus(
  actor: AuthorizationActor,
  followUpId: string,
  status: 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'SCHEDULED',
): Promise<string> {
  requirePermission(actor, PERMISSIONS.FOLLOWUP_MANAGE);
  const prisma = getPrisma();
  const followUp = await prisma.followUp.findFirst({
    where: { id: followUpId, organizationId: actor.organizationId },
    select: { id: true, patientId: true },
  });
  if (!followUp) throw new WorkflowError('Follow-up not found.');
  await prisma.followUp.update({
    where: { id: followUp.id },
    data: { status, completedAt: status === 'SCHEDULED' ? null : new Date() },
  });
  await recordAudit(actor, { action: `followup.${status.toLowerCase()}`, resourceType: 'FollowUp', resourceId: followUp.id });
  return followUp.patientId;
}
