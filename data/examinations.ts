import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import {
  ConsentPurpose,
  ExaminationStatus,
  FollowUpStatus,
  ImageQualityStatus,
  type Laterality,
  ModelDeploymentStatus,
  type Prisma,
  PredictionStatus,
  PredictionTask,
  type ReferralUrgency,
  ReviewDecision,
  WorkflowStatus,
} from '@/generated/prisma/client';
import { recordAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AuthorizationError, requirePermission, type AuthorizationActor } from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';
import { DR_GRADES, getDrGrade } from '@/lib/dr/grades';
import { CURATED_GENERATOR } from '@/lib/education/curated';
import { EDUCATION_PROMPT_VERSION, generateEducation } from '@/lib/education/generate';
import { educationContentSchema, type EducationContent } from '@/lib/education/schema';
import { EDGE_LABELS, type EdgeResult } from '@/lib/edge/schema';
import { ageInYears } from '@/lib/format';
import { findStudentVariant, PREPROCESSING_VERSION, STUDENT_MODEL } from '@/lib/modelRegistry';
import { sha256Hex } from '@/lib/storage/crypto';
import { getImage, putImage } from '@/lib/storage/imageStore';
import { hasActiveConsent } from './consent';
import { effectiveGrade, examGradeSelect, PatientNotFoundError } from './patients';

export class ConsentRequiredError extends Error {
  constructor() {
    super('Image-processing consent is not active for this patient. Record consent before screening.');
    this.name = 'ConsentRequiredError';
  }
}

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

function displayName(demographics: { givenName: string; familyName: string; preferredName: string | null } | null): string {
  return demographics ? `${demographics.preferredName || demographics.givenName} ${demographics.familyName}` : 'Unknown patient';
}

// ---------------------------------------------------------------------------
// Screening

export async function assertScreeningAllowed(actor: AuthorizationActor, patientId: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.EXAMINATION_CREATE);
  requirePermission(actor, PERMISSIONS.PREDICTION_RUN);
  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, organizationId: actor.organizationId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!patient) throw new PatientNotFoundError();
  if (!(await hasActiveConsent(actor.organizationId, patientId, ConsentPurpose.IMAGE_PROCESSING))) {
    await recordAudit(actor, { action: 'screening.run', resourceType: 'Patient', resourceId: patientId, outcome: 'DENIED', metadata: { reason: 'consent' } });
    throw new ConsentRequiredError();
  }
}

/** Finds or registers the immutable model-version row for the artifact the Pi reported. */
async function resolveModelVersion(result: EdgeResult, transaction: Prisma.TransactionClient): Promise<string> {
  const variant = findStudentVariant(result.artifact_sha256);
  const row = await transaction.modelVersion.upsert({
    where: { artifactSha256: result.artifact_sha256 },
    update: {},
    create: {
      modelKey: STUDENT_MODEL.id,
      version: `${result.model_file}-sha256-${result.artifact_sha256.slice(0, 12)}`,
      artifactSha256: result.artifact_sha256,
      artifactStorageKey: `edge:${result.model_file}`,
      task: PredictionTask.DR_SEVERITY,
      inputSpecification: { description: STUDENT_MODEL.input, inputName: 'input' },
      outputLabels: [...EDGE_LABELS],
      labelOrderVerified: true,
      preprocessingSpecification: { version: result.preprocessing_version, description: STUDENT_MODEL.preprocessing },
      preprocessingVerified: result.preprocessing_version === PREPROCESSING_VERSION,
      decisionThresholds: { grade: 'argmax', anyDr: '1 - P(No DR), argmax threshold', referable: 'P(Moderate)+P(Severe)+P(PDR)' },
      validationDataset: 'APTOS 2019 validation split (n=733)',
      validationMetrics: variant ? { ...STUDENT_MODEL.validation, accuracy: variant.accuracy, qwk: variant.qwk } : { note: 'Unregistered artifact digest' },
      intendedUse: 'Research-only AI-assisted 5-grade DR screening of colour fundus images; clinician confirmation required.',
      knownLimitations: [...STUDENT_MODEL.limitations],
      deploymentStatus: ModelDeploymentStatus.RESEARCH_ONLY,
    },
    select: { id: true },
  });
  return row.id;
}

export interface ScreeningInput {
  patientId: string;
  eye: Laterality;
  source: 'upload' | 'pi-camera';
  captureDevice: string;
  original: { data: Buffer; mimeType: string; width: number; height: number };
  result: EdgeResult;
}

export async function recordScreening(actor: AuthorizationActor, input: ScreeningInput): Promise<{ examinationId: string }> {
  await assertScreeningAllowed(actor, input.patientId);
  const prisma = getPrisma();
  const { result } = input;

  // Encrypted originals are written before the transaction; keys are opaque.
  const originalKey = await putImage(actor.organizationId, input.original.mimeType, input.original.data, 'original');
  const modelInputKey = result.gradable && result.model_input_png
    ? await putImage(actor.organizationId, 'image/png', Buffer.from(result.model_input_png, 'base64'), 'model-input')
    : null;

  // Large base64 payloads are kept in encrypted storage, not in JSON columns.
  const rawOutput = { ...result, model_input_png: undefined, captured_jpeg: undefined } as Prisma.InputJsonValue;

  const examinationId = await prisma.$transaction(async (transaction) => {
    const modelVersionId = await resolveModelVersion(result, transaction);
    const exam = await transaction.examination.create({
      data: {
        organizationId: actor.organizationId,
        patientId: input.patientId,
        eye: input.eye,
        status: result.gradable ? ExaminationStatus.PENDING_REVIEW : ExaminationStatus.SCREENING_COMPLETE,
        imageSource: input.source,
        captureDevice: input.captureDevice,
        createdByUserId: actor.userId,
      },
      select: { id: true },
    });
    const image = await transaction.eyeImage.create({
      data: {
        organizationId: actor.organizationId,
        examinationId: exam.id,
        eye: input.eye,
        storageKey: originalKey,
        modelInputStorageKey: modelInputKey,
        sha256: sha256Hex(input.original.data),
        mimeType: input.original.mimeType,
        width: input.original.width,
        height: input.original.height,
        capturedAt: new Date(),
      },
      select: { id: true },
    });
    await transaction.imageQualityAssessment.create({
      data: {
        organizationId: actor.organizationId,
        eyeImageId: image.id,
        status: result.quality.gradable ? ImageQualityStatus.GRADABLE : ImageQualityStatus.UNGRADABLE,
        reasonCodes: result.quality.reasons,
      },
    });
    const prediction = await transaction.prediction.create({
      data: {
        organizationId: actor.organizationId,
        examinationId: exam.id,
        eyeImageId: image.id,
        modelVersionId,
        task: PredictionTask.DR_SEVERITY,
        status: result.gradable ? PredictionStatus.COMPLETED : PredictionStatus.REJECTED_UNGRADABLE,
        outcome: result.gradable ? result.label : 'Ungradable image',
        drGrade: result.gradable ? result.label : null,
        rawOutput,
        confidence: result.gradable ? result.confidence : null,
        uncertainty: result.gradable ? 1 - result.confidence : null,
        inferenceTimeMs: result.gradable ? result.latency_ms : null,
      },
      select: { id: true },
    });
    if (result.gradable) {
      await transaction.predictionProbability.createMany({
        data: result.probability_vector.map((probability, labelIndex) => ({
          predictionId: prediction.id,
          label: EDGE_LABELS[labelIndex],
          labelIndex,
          probability,
          rawScore: Math.log(Math.max(probability, 1e-12)),
        })),
      });
    }
    await transaction.patient.update({ where: { id: input.patientId }, data: { updatedAt: new Date() } });
    await recordAudit(actor, {
      action: 'screening.run',
      resourceType: 'Examination',
      resourceId: exam.id,
      metadata: {
        source: input.source,
        gradable: result.gradable,
        modelVersion: result.model_version,
        artifactSha256: result.artifact_sha256,
        preprocessingVersion: result.preprocessing_version,
      },
    }, transaction);
    return exam.id;
  });

  return { examinationId };
}

// ---------------------------------------------------------------------------
// Listing

export interface ExaminationListFilters {
  status?: string;
  grade?: string;
  query?: string;
  take?: number;
}

export async function listExaminations(actor: AuthorizationActor, filters: ExaminationListFilters = {}) {
  requirePermission(actor, PERMISSIONS.EXAMINATION_READ);
  const query = filters.query?.trim().slice(0, 100);
  const status = Object.values(ExaminationStatus).find((value) => value === filters.status);
  const exams = await getPrisma().examination.findMany({
    where: {
      organizationId: actor.organizationId,
      ...(status ? { status } : {}),
      ...(query
        ? {
            patient: {
              OR: [
                { patientNumber: { contains: query, mode: 'insensitive' as const } },
                { demographics: { givenName: { contains: query, mode: 'insensitive' as const } } },
                { demographics: { familyName: { contains: query, mode: 'insensitive' as const } } },
              ],
            },
          }
        : {}),
    },
    orderBy: { examinedAt: 'desc' },
    take: filters.take ?? 100,
    select: {
      id: true,
      eye: true,
      status: true,
      examinedAt: true,
      imageSource: true,
      patient: { select: { id: true, patientNumber: true, demographics: { select: { givenName: true, familyName: true, preferredName: true } } } },
      ...examGradeSelect,
      predictions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, drGrade: true, confidence: true } },
    },
  });

  const rows = exams.map((exam) => {
    const grade = effectiveGrade(exam);
    return {
      id: exam.id,
      eye: exam.eye,
      status: exam.status,
      examinedAt: exam.examinedAt.toISOString(),
      imageSource: exam.imageSource,
      patientId: exam.patient.id,
      patientNumber: exam.patient.patientNumber,
      patientName: displayName(exam.patient.demographics),
      grade: grade.grade,
      gradeSource: grade.source,
      confidence: exam.predictions[0]?.confidence?.toNumber() ?? null,
    };
  });
  const gradeFilter = filters.grade === 'referable'
    ? (row: (typeof rows)[number]) => row.grade !== null && row.grade >= 2
    : filters.grade === 'ungradable'
      ? (row: (typeof rows)[number]) => row.gradeSource === 'ungradable'
      : filters.grade && /^[0-4]$/.test(filters.grade)
        ? (row: (typeof rows)[number]) => row.grade === Number(filters.grade)
        : null;
  return gradeFilter ? rows.filter(gradeFilter) : rows;
}

export type ExaminationListItem = Awaited<ReturnType<typeof listExaminations>>[number];

// ---------------------------------------------------------------------------
// Detail

export async function getExaminationDetail(actor: AuthorizationActor, examinationId: string) {
  requirePermission(actor, PERMISSIONS.EXAMINATION_READ);
  const exam = await getPrisma().examination.findFirst({
    where: { id: examinationId, organizationId: actor.organizationId },
    include: {
      patient: {
        select: {
          id: true,
          patientNumber: true,
          demographics: { select: { givenName: true, familyName: true, preferredName: true, dateOfBirth: true, sexAtBirth: true, preferredLanguage: true } },
          contacts: { where: { type: 'PHONE' }, take: 1, select: { value: true } },
        },
      },
      createdBy: { select: { displayName: true } },
      images: {
        orderBy: { createdAt: 'desc' },
        include: { qualityAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 } },
      },
      predictions: {
        orderBy: { createdAt: 'desc' },
        include: {
          probabilities: { orderBy: { labelIndex: 'asc' } },
          modelVersion: { select: { modelKey: true, version: true, artifactSha256: true, deploymentStatus: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { displayName: true } },
          amendments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { displayName: true } } } },
        },
      },
      referrals: { orderBy: { referredAt: 'desc' } },
      educationReports: { orderBy: { createdAt: 'desc' }, take: 1, include: { createdBy: { select: { displayName: true } } } },
      reportShares: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!exam) return null;

  await recordAudit(actor, { action: 'examination.view', resourceType: 'Examination', resourceId: exam.id });

  const followUps = await getPrisma().followUp.findMany({
    where: { organizationId: actor.organizationId, examinationId: exam.id },
    orderBy: { dueAt: 'asc' },
  });

  const prediction = exam.predictions[0] ?? null;
  const raw = (prediction?.rawOutput ?? null) as Record<string, unknown> | null;
  const quality = (raw?.quality ?? null) as { sharpness?: number; brightness?: number; reasons?: string[] } | null;
  const image = exam.images[0] ?? null;
  const signedReview = exam.reviews.find((review) => review.signedAt) ?? null;
  const grade = effectiveGrade({ reviews: exam.reviews, predictions: exam.predictions });
  const education = exam.educationReports[0];
  const parsedEducation = education ? educationContentSchema.safeParse(education.content) : null;

  return {
    id: exam.id,
    eye: exam.eye,
    status: exam.status,
    examinedAt: exam.examinedAt.toISOString(),
    imageSource: exam.imageSource,
    captureDevice: exam.captureDevice,
    createdBy: exam.createdBy.displayName,
    patient: {
      id: exam.patient.id,
      patientNumber: exam.patient.patientNumber,
      displayName: displayName(exam.patient.demographics),
      age: ageInYears(exam.patient.demographics?.dateOfBirth),
      sexAtBirth: exam.patient.demographics?.sexAtBirth ?? 'NOT_RECORDED',
      preferredLanguage: exam.patient.demographics?.preferredLanguage ?? null,
      phone: exam.patient.contacts[0]?.value ?? null,
    },
    image: image
      ? {
          id: image.id,
          width: image.width,
          height: image.height,
          sha256: image.sha256,
          hasModelInput: Boolean(image.modelInputStorageKey),
          quality: image.qualityAssessments[0]?.status ?? 'NOT_ASSESSED',
          qualityReasons: image.qualityAssessments[0]?.reasonCodes ?? [],
        }
      : null,
    quality: quality ? { sharpness: quality.sharpness ?? null, brightness: quality.brightness ?? null } : null,
    prediction: prediction
      ? {
          id: prediction.id,
          status: prediction.status,
          label: prediction.drGrade,
          grade: prediction.drGrade ? EDGE_LABELS.indexOf(prediction.drGrade as (typeof EDGE_LABELS)[number]) : null,
          confidence: prediction.confidence?.toNumber() ?? null,
          inferenceTimeMs: prediction.inferenceTimeMs?.toNumber() ?? null,
          probabilities: prediction.probabilities.map((probability) => probability.probability?.toNumber() ?? 0),
          anyDrProbability: typeof raw?.any_dr_probability === 'number' ? raw.any_dr_probability : null,
          referableProbability: typeof raw?.referable_probability === 'number' ? raw.referable_probability : null,
          modelVersion: prediction.modelVersion.version,
          artifactSha256: prediction.modelVersion.artifactSha256,
          deploymentStatus: prediction.modelVersion.deploymentStatus,
          preprocessingVersion: typeof raw?.preprocessing_version === 'string' ? raw.preprocessing_version : null,
          createdAt: prediction.createdAt.toISOString(),
        }
      : null,
    effectiveGrade: grade,
    review: signedReview
      ? {
          id: signedReview.id,
          decision: signedReview.decision,
          confirmedGrade: signedReview.confirmedGrade,
          assessment: signedReview.assessment,
          referralUrgency: signedReview.referralUrgency,
          referralReason: signedReview.referralReason,
          repeatImagingReason: signedReview.repeatImagingReason,
          reviewer: signedReview.reviewer.displayName,
          signedAt: signedReview.signedAt!.toISOString(),
          amendments: signedReview.amendments.map((amendment) => ({
            id: amendment.id,
            author: amendment.author.displayName,
            reason: amendment.reason,
            amendment: amendment.amendment,
            createdAt: amendment.createdAt.toISOString(),
          })),
        }
      : null,
    referrals: exam.referrals.map((referral) => ({
      id: referral.id,
      urgency: referral.urgency,
      status: referral.status,
      reason: referral.reason,
      destination: referral.destination,
      referredAt: referral.referredAt.toISOString(),
    })),
    followUps: followUps.map((followUp) => ({
      id: followUp.id,
      status: followUp.status,
      dueAt: followUp.dueAt.toISOString(),
      notes: followUp.notes,
    })),
    education: education && parsedEducation?.success
      ? {
          id: education.id,
          content: parsedEducation.data,
          generator: education.generator,
          grade: education.grade,
          gradeSource: education.gradeSource,
          language: education.language,
          createdAt: education.createdAt.toISOString(),
          createdBy: education.createdBy?.displayName ?? null,
        }
      : null,
    activeShares: exam.reportShares.map((share) => ({
      id: share.id,
      expiresAt: share.expiresAt.toISOString(),
      viewCount: share.viewCount,
      createdAt: share.createdAt.toISOString(),
    })),
  };
}

export type ExaminationDetailDTO = NonNullable<Awaited<ReturnType<typeof getExaminationDetail>>>;

// ---------------------------------------------------------------------------
// Images

export async function readExaminationImage(actor: AuthorizationActor, imageId: string, variant: 'original' | 'model-input') {
  requirePermission(actor, PERMISSIONS.EXAMINATION_READ);
  const image = await getPrisma().eyeImage.findFirst({
    where: { id: imageId, organizationId: actor.organizationId },
    select: { id: true, storageKey: true, modelInputStorageKey: true, mimeType: true },
  });
  if (!image) return null;
  const key = variant === 'original' ? image.storageKey : image.modelInputStorageKey;
  if (!key) return null;
  await recordAudit(actor, { action: 'image.view', resourceType: 'EyeImage', resourceId: image.id, metadata: { variant } });
  return { data: await getImage(key), mimeType: variant === 'original' ? image.mimeType : 'image/png' };
}

// ---------------------------------------------------------------------------
// Clinician review (confirm or override the AI result, then sign)

export interface ReviewInput {
  decision: ReviewDecision;
  confirmedGrade: number | null;
  assessment: string;
  referralUrgency: ReferralUrgency;
  referralReason: string;
  referralDestination: string;
  repeatImagingReason: string;
  followUpDate: string;
}

export async function signReview(actor: AuthorizationActor, examinationId: string, input: ReviewInput): Promise<void> {
  requirePermission(actor, PERMISSIONS.REVIEW_SIGN);
  const prisma = getPrisma();
  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, organizationId: actor.organizationId },
    select: {
      id: true,
      patientId: true,
      status: true,
      reviews: { where: { signedAt: { not: null } }, select: { id: true } },
      predictions: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, drGrade: true, status: true } },
    },
  });
  if (!exam) throw new WorkflowError('Examination not found.');
  if (exam.reviews.length) throw new WorkflowError('This examination already has a signed review. Add an amendment instead.');

  const prediction = exam.predictions[0];
  const aiGrade = prediction?.drGrade ? EDGE_LABELS.indexOf(prediction.drGrade as (typeof EDGE_LABELS)[number]) : null;
  let confirmedGrade = input.confirmedGrade;
  if (input.decision === ReviewDecision.AGREE) {
    if (aiGrade === null || aiGrade < 0) throw new WorkflowError('There is no AI grade to agree with. Choose disagree, indeterminate or repeat imaging.');
    confirmedGrade = aiGrade;
  }
  if (input.decision === ReviewDecision.DISAGREE && confirmedGrade === null) {
    throw new WorkflowError('Select the grade you assign when you disagree with the AI result.');
  }
  if (input.decision === ReviewDecision.REPEAT_IMAGING || input.decision === ReviewDecision.INDETERMINATE) {
    confirmedGrade = null;
  }

  await prisma.$transaction(async (transaction) => {
    const now = new Date();
    const review = await transaction.clinicianReview.create({
      data: {
        organizationId: actor.organizationId,
        examinationId: exam.id,
        predictionId: prediction?.id ?? null,
        reviewerId: actor.userId,
        decision: input.decision,
        confirmedGrade,
        assessment: input.assessment,
        referralUrgency: input.referralUrgency,
        referralReason: input.referralReason || null,
        repeatImagingReason: input.repeatImagingReason || null,
        signedAt: now,
        lockedAt: now,
      },
      select: { id: true },
    });
    if (confirmedGrade !== null) {
      await transaction.clinicianDiagnosis.create({
        data: {
          examinationId: exam.id,
          reviewId: review.id,
          clinicianId: actor.userId,
          codeSystem: 'ICDR',
          code: `DR-${confirmedGrade}`,
          display: getDrGrade(confirmedGrade).clinicalName,
        },
      });
    }
    if (input.referralUrgency !== 'NOT_APPLICABLE') {
      await transaction.referral.create({
        data: {
          organizationId: actor.organizationId,
          patientId: exam.patientId,
          examinationId: exam.id,
          reviewId: review.id,
          urgency: input.referralUrgency,
          status: WorkflowStatus.ACTIVE,
          destination: input.referralDestination || null,
          reason: input.referralReason || (confirmedGrade !== null ? getDrGrade(confirmedGrade).suggestedFollowUpText : 'Clinician referral'),
        },
      });
    }
    if (input.followUpDate) {
      await transaction.followUp.create({
        data: {
          organizationId: actor.organizationId,
          patientId: exam.patientId,
          dueAt: new Date(`${input.followUpDate}T09:00:00.000Z`),
          examinationId: exam.id,
          status: FollowUpStatus.SCHEDULED,
          notes: 'Retinal rescreening',
        },
      });
    }
    await transaction.examination.update({ where: { id: exam.id }, data: { status: ExaminationStatus.REVIEWED } });
    await recordAudit(actor, {
      action: 'review.sign',
      resourceType: 'Examination',
      resourceId: exam.id,
      metadata: { decision: input.decision, confirmedGrade, aiGrade, referralUrgency: input.referralUrgency },
    }, transaction);
  });
}

export async function amendReview(actor: AuthorizationActor, examinationId: string, reason: string, amendment: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.REVIEW_SIGN);
  const review = await getPrisma().clinicianReview.findFirst({
    where: { examinationId, organizationId: actor.organizationId, signedAt: { not: null } },
    select: { id: true },
  });
  if (!review) throw new WorkflowError('There is no signed review to amend.');
  const created = await getPrisma().reviewAmendment.create({ data: { reviewId: review.id, authorId: actor.userId, reason, amendment } });
  await recordAudit(actor, { action: 'review.amend', resourceType: 'ClinicianReview', resourceId: review.id, metadata: { amendmentId: created.id } });
}

export async function reviewQueue(actor: AuthorizationActor) {
  requirePermission(actor, PERMISSIONS.EXAMINATION_READ);
  return listExaminations(actor, { status: ExaminationStatus.PENDING_REVIEW, take: 200 });
}

// ---------------------------------------------------------------------------
// Patient education (LLM)

export async function generateEducationForExamination(actor: AuthorizationActor, examinationId: string): Promise<{ notice: string | null }> {
  requirePermission(actor, PERMISSIONS.EDUCATION_GENERATE);
  const prisma = getPrisma();
  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, organizationId: actor.organizationId },
    select: {
      id: true,
      eye: true,
      patientId: true,
      ...examGradeSelect,
      reviews: {
        where: { signedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { confirmedGrade: true, signedAt: true, referralUrgency: true },
      },
      patient: {
        select: {
          demographics: { select: { dateOfBirth: true, sexAtBirth: true, preferredLanguage: true } },
          medicalHistories: { orderBy: { recordedAt: 'desc' }, take: 1, select: { diabetesType: true, diabetesDiagnosedAt: true, pregnancyStatus: true } },
          measurements: {
            where: { type: { in: ['HBA1C', 'SYSTOLIC_BLOOD_PRESSURE', 'DIASTOLIC_BLOOD_PRESSURE'] } },
            orderBy: { observedAt: 'desc' },
            take: 10,
            select: { type: true, value: true, unit: true, observedAt: true },
          },
          medications: { where: { endedAt: null }, select: { name: true, instructions: true } },
          allergies: { select: { substance: true } },
          ocularHistories: { select: { condition: true, eye: true } },
        },
      },
    },
  });
  if (!exam) throw new WorkflowError('Examination not found.');

  const grade = effectiveGrade(exam);
  if (grade.grade === null) {
    throw new WorkflowError('Education needs a DR grade. Recapture an ungradable image or sign a review with a grade first.');
  }
  const gradeInfo = getDrGrade(grade.grade);
  const followUp = await prisma.followUp.findFirst({
    where: { organizationId: actor.organizationId, examinationId: exam.id, status: FollowUpStatus.SCHEDULED },
    orderBy: { dueAt: 'asc' },
    select: { dueAt: true },
  });

  const p = exam.patient;
  const history = p.medicalHistories[0];
  const hba1c = p.measurements.find((m) => m.type === 'HBA1C');
  const systolic = p.measurements.find((m) => m.type === 'SYSTOLIC_BLOOD_PRESSURE');
  const diastolic = p.measurements.find((m) => m.type === 'DIASTOLIC_BLOOD_PRESSURE');
  const language = p.demographics?.preferredLanguage?.trim() || 'English';
  const signed = exam.reviews[0];

  const generated = await generateEducation({
    grade: grade.grade,
    gradeLabel: gradeInfo.clinicalName,
    gradeSource: grade.source === 'clinician' ? 'clinician-confirmed' : 'ai-preliminary',
    eye: exam.eye,
    recommendedFollowUp: followUp
      ? `Next eye examination scheduled for ${followUp.dueAt.toISOString().slice(0, 10)} (${gradeInfo.suggestedFollowUpText.toLowerCase()})`
      : gradeInfo.suggestedFollowUpText,
    referralUrgency: signed?.referralUrgency ?? gradeInfo.suggestedUrgency,
    patient: {
      ageYears: ageInYears(p.demographics?.dateOfBirth),
      sexAtBirth: p.demographics?.sexAtBirth ?? 'NOT_RECORDED',
      preferredLanguage: language,
      diabetesType: history?.diabetesType ?? null,
      diabetesDurationYears: history?.diabetesDiagnosedAt ? ageInYears(history.diabetesDiagnosedAt) : null,
      latestHbA1c: hba1c ? `${hba1c.value.toNumber()}${hba1c.unit} (${hba1c.observedAt.toISOString().slice(0, 10)})` : null,
      latestBloodPressure: systolic && diastolic ? `${systolic.value.toNumber()}/${diastolic.value.toNumber()} mmHg` : null,
      medications: p.medications.map((medication) => [medication.name, medication.instructions].filter(Boolean).join(' – ')),
      allergies: p.allergies.map((allergy) => allergy.substance),
      ocularHistory: p.ocularHistories.map((entry) => `${entry.condition}${entry.eye ? ` (${entry.eye.toLowerCase()} eye)` : ''}`),
      pregnancyStatus: history?.pregnancyStatus ?? null,
    },
  });

  const record = await prisma.patientEducation.create({
    data: {
      organizationId: actor.organizationId,
      patientId: exam.patientId,
      examinationId: exam.id,
      grade: grade.grade,
      gradeSource: grade.source === 'clinician' ? 'clinician-confirmed' : 'ai-preliminary',
      language: generated.generator === CURATED_GENERATOR ? 'English' : language,
      content: generated.content as Prisma.InputJsonValue,
      generator: generated.generator,
      promptVersion: generated.generator === CURATED_GENERATOR ? CURATED_GENERATOR : EDUCATION_PROMPT_VERSION,
      createdByUserId: actor.userId,
    },
    select: { id: true },
  });
  await recordAudit(actor, {
    action: 'education.generate',
    resourceType: 'PatientEducation',
    resourceId: record.id,
    metadata: { examinationId: exam.id, generator: generated.generator, gradeSource: grade.source },
  });
  return { notice: generated.notice };
}

// ---------------------------------------------------------------------------
// Patient share links

const SHARE_DAYS = 14;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createShareLink(actor: AuthorizationActor, examinationId: string): Promise<{ token: string; expiresAt: string }> {
  requirePermission(actor, PERMISSIONS.REPORT_SHARE);
  const exam = await getPrisma().examination.findFirst({
    where: { id: examinationId, organizationId: actor.organizationId },
    select: { id: true, status: true },
  });
  if (!exam) throw new WorkflowError('Examination not found.');
  if (exam.status !== ExaminationStatus.REVIEWED) {
    throw new WorkflowError('Only clinician-reviewed examinations can be shared with the patient.');
  }
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + SHARE_DAYS * 24 * 60 * 60 * 1000);
  const share = await getPrisma().reportShare.create({
    data: { organizationId: actor.organizationId, examinationId: exam.id, tokenHash: hashToken(token), expiresAt, createdByUserId: actor.userId },
    select: { id: true },
  });
  await recordAudit(actor, { action: 'report.share.create', resourceType: 'ReportShare', resourceId: share.id, metadata: { examinationId: exam.id } });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function revokeShareLinks(actor: AuthorizationActor, examinationId: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.REPORT_SHARE);
  const result = await getPrisma().reportShare.updateMany({
    where: { examinationId, organizationId: actor.organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await recordAudit(actor, { action: 'report.share.revoke', resourceType: 'Examination', resourceId: examinationId, metadata: { revoked: result.count } });
}

/** Public, token-gated view for the patient's phone. Returns the minimum needed. */
export async function resolveShareLink(token: string) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const prisma = getPrisma();
  const share = await prisma.reportShare.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      organization: { select: { name: true } },
      examination: {
        include: {
          patient: { select: { demographics: { select: { givenName: true, preferredName: true } } } },
          reviews: { where: { signedAt: { not: null } }, orderBy: { createdAt: 'desc' }, take: 1, include: { reviewer: { select: { displayName: true } } } },
          educationReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });
  if (!share || share.revokedAt || share.expiresAt <= new Date()) return null;
  const review = share.examination.reviews[0];
  if (!review) return null;

  await prisma.$transaction([
    prisma.reportShare.update({ where: { id: share.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } }),
    prisma.auditEvent.create({
      data: { organizationId: share.organizationId, action: 'report.share.view', resourceType: 'ReportShare', resourceId: share.id, outcome: 'SUCCESS' },
    }),
  ]);

  const followUp = await prisma.followUp.findFirst({
    where: { organizationId: share.organizationId, examinationId: share.examination.id, status: FollowUpStatus.SCHEDULED },
    orderBy: { dueAt: 'asc' },
    select: { dueAt: true },
  });
  const education = share.examination.educationReports[0];
  const parsed = education ? educationContentSchema.safeParse(education.content) : null;
  const demographics = share.examination.patient.demographics;

  return {
    clinicName: share.organization.name,
    firstName: demographics?.preferredName || demographics?.givenName || 'Patient',
    examinedAt: share.examination.examinedAt.toISOString(),
    eye: share.examination.eye,
    decision: review.decision,
    grade: review.confirmedGrade,
    gradeInfo: review.confirmedGrade !== null ? DR_GRADES[review.confirmedGrade] : null,
    referralUrgency: review.referralUrgency,
    repeatImagingReason: review.repeatImagingReason,
    reviewer: review.reviewer.displayName,
    signedAt: review.signedAt!.toISOString(),
    followUpDue: followUp?.dueAt.toISOString() ?? null,
    education: parsed?.success ? { content: parsed.data as EducationContent, generator: education!.generator } : null,
    expiresAt: share.expiresAt.toISOString(),
  };
}

export { AuthorizationError };
