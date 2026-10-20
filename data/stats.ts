import 'server-only';

import {
  ExaminationStatus,
  FollowUpStatus,
  PatientStatus,
  PredictionStatus,
} from '@/generated/prisma/client';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { requirePermission, type AuthorizationActor } from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';
import { effectiveGrade, examGradeSelect } from './patients';

export async function getDashboardStats(actor: AuthorizationActor) {
  requirePermission(actor, PERMISSIONS.PATIENT_READ);
  const prisma = getPrisma();
  const orgId = actor.organizationId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [patients, examsTotal, exams30d, pendingReview, ungradable, overdueFollowUps, dueThisWeek, recent] = await Promise.all([
    prisma.patient.count({ where: { organizationId: orgId, status: PatientStatus.ACTIVE } }),
    prisma.examination.count({ where: { organizationId: orgId } }),
    prisma.examination.count({ where: { organizationId: orgId, examinedAt: { gte: thirtyDaysAgo } } }),
    prisma.examination.count({ where: { organizationId: orgId, status: ExaminationStatus.PENDING_REVIEW } }),
    prisma.prediction.count({ where: { organizationId: orgId, status: PredictionStatus.REJECTED_UNGRADABLE } }),
    prisma.followUp.count({ where: { organizationId: orgId, status: { in: [FollowUpStatus.SCHEDULED, FollowUpStatus.DUE] }, dueAt: { lt: now } } }),
    prisma.followUp.count({
      where: {
        organizationId: orgId,
        status: { in: [FollowUpStatus.SCHEDULED, FollowUpStatus.DUE] },
        dueAt: { gte: now, lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.examination.findMany({
      where: { organizationId: orgId },
      orderBy: { examinedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        eye: true,
        status: true,
        examinedAt: true,
        patient: { select: { id: true, patientNumber: true, demographics: { select: { givenName: true, familyName: true, preferredName: true } } } },
        ...examGradeSelect,
      },
    }),
  ]);

  return {
    patients,
    examsTotal,
    exams30d,
    pendingReview,
    ungradable,
    overdueFollowUps,
    dueThisWeek,
    recent: recent.map((exam) => {
      const grade = effectiveGrade(exam);
      const d = exam.patient.demographics;
      return {
        id: exam.id,
        eye: exam.eye,
        status: exam.status,
        examinedAt: exam.examinedAt.toISOString(),
        patientId: exam.patient.id,
        patientNumber: exam.patient.patientNumber,
        patientName: d ? `${d.preferredName || d.givenName} ${d.familyName}` : 'Unknown',
        grade: grade.grade,
        gradeSource: grade.source,
      };
    }),
  };
}

/** Aggregate figures for the Reports page. Uses the clinician grade when signed, else the AI grade. */
export async function getReportStats(actor: AuthorizationActor, days: number) {
  requirePermission(actor, PERMISSIONS.EXAMINATION_READ);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const exams = await getPrisma().examination.findMany({
    where: { organizationId: actor.organizationId, examinedAt: { gte: since } },
    select: {
      id: true,
      examinedAt: true,
      status: true,
      imageSource: true,
      patientId: true,
      reviews: { orderBy: { createdAt: 'desc' }, select: { confirmedGrade: true, signedAt: true, decision: true } },
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, drGrade: true, inferenceTimeMs: true, modelVersion: { select: { version: true } } },
      },
    },
  });

  const gradeCounts = [0, 0, 0, 0, 0];
  let ungradable = 0;
  let reviewed = 0;
  let agreements = 0;
  let disagreements = 0;
  const latency: number[] = [];
  const byMonth = new Map<string, number>();
  const byModel = new Map<string, number>();
  const bySource = new Map<string, number>();
  const referablePatients = new Set<string>();

  for (const exam of exams) {
    const grade = effectiveGrade(exam);
    if (grade.grade !== null) gradeCounts[grade.grade] += 1;
    if (grade.source === 'ungradable') ungradable += 1;
    if (grade.grade !== null && grade.grade >= 2) referablePatients.add(exam.patientId);
    const signed = exam.reviews.find((review) => review.signedAt);
    if (signed) {
      reviewed += 1;
      if (signed.decision === 'AGREE') agreements += 1;
      if (signed.decision === 'DISAGREE') disagreements += 1;
    }
    const prediction = exam.predictions[0];
    if (prediction?.inferenceTimeMs) latency.push(prediction.inferenceTimeMs.toNumber());
    if (prediction) byModel.set(prediction.modelVersion.version, (byModel.get(prediction.modelVersion.version) ?? 0) + 1);
    const month = exam.examinedAt.toISOString().slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    const source = exam.imageSource ?? 'unknown';
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
  }
  latency.sort((a, b) => a - b);

  return {
    days,
    total: exams.length,
    gradeCounts,
    ungradable,
    reviewed,
    agreements,
    disagreements,
    referablePatients: referablePatients.size,
    medianLatencyMs: latency.length ? latency[Math.floor(latency.length / 2)] : null,
    byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)),
    byModel: [...byModel.entries()],
    bySource: [...bySource.entries()],
  };
}
