-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DECEASED');

-- CreateEnum
CREATE TYPE "SexAtBirth" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'UNKNOWN', 'NOT_RECORDED');

-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('TYPE_1', 'TYPE_2', 'GESTATIONAL', 'OTHER', 'UNKNOWN', 'NONE_REPORTED');

-- CreateEnum
CREATE TYPE "PregnancyStatus" AS ENUM ('PREGNANT', 'NOT_PREGNANT', 'UNKNOWN', 'NOT_APPLICABLE', 'NOT_RECORDED');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'UNKNOWN', 'NOT_RECORDED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('CARE_DELIVERY', 'IMAGE_PROCESSING', 'DATA_RETENTION', 'RESEARCH', 'COMMUNICATIONS');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Laterality" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "ExaminationStatus" AS ENUM ('DRAFT', 'READY_FOR_SCREENING', 'SCREENING_COMPLETE', 'PENDING_REVIEW', 'REVIEWED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImageQualityStatus" AS ENUM ('NOT_ASSESSED', 'GRADABLE', 'UNGRADABLE', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "ModelDeploymentStatus" AS ENUM ('BLOCKED_PENDING_VALIDATION', 'RESEARCH_ONLY', 'APPROVED_FOR_SCREENING', 'RETIRED');

-- CreateEnum
CREATE TYPE "PredictionTask" AS ENUM ('DR_BINARY', 'DR_SEVERITY', 'IMAGE_QUALITY', 'LESION_LOCALIZATION', 'OTHER_OCULAR_SCREENING');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('COMPLETED', 'INCONCLUSIVE', 'REJECTED_UNGRADABLE', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('AGREE', 'DISAGREE', 'INDETERMINATE', 'REPEAT_IMAGING');

-- CreateEnum
CREATE TYPE "ReferralUrgency" AS ENUM ('ROUTINE', 'SOON', 'URGENT', 'EMERGENCY', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('SCHEDULED', 'DUE', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('HBA1C', 'BLOOD_GLUCOSE', 'SYSTOLIC_BLOOD_PRESSURE', 'DIASTOLIC_BLOOD_PRESSURE', 'TOTAL_CHOLESTEROL', 'LDL_CHOLESTEROL', 'HDL_CHOLESTEROL', 'TRIGLYCERIDES', 'INTRAOCULAR_PRESSURE', 'VISUAL_ACUITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'CLINICAL_REVIEW', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "retentionPolicyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "oidcSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientNumber" TEXT NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_demographics" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "sexAtBirth" "SexAtBirth" NOT NULL DEFAULT 'NOT_RECORDED',
    "preferredName" TEXT,
    "preferredLanguage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_demographics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_identifiers" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "patient_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_contacts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "patient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "evidenceStorageKey" TEXT,
    "capturedByUserId" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_histories" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diabetesType" "DiabetesType" NOT NULL DEFAULT 'UNKNOWN',
    "diabetesDiagnosedAt" DATE,
    "pregnancyStatus" "PregnancyStatus" NOT NULL DEFAULT 'NOT_RECORDED',
    "smokingStatus" "SmokingStatus" NOT NULL DEFAULT 'NOT_RECORDED',
    "visualSymptoms" TEXT,
    "notes" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_factors" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "value" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "risk_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_measurements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "MeasurementType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "recordedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "startedAt" DATE,
    "endedAt" DATE,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocular_histories" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eye" "Laterality",
    "condition" TEXT NOT NULL,
    "surgeryOrTreatment" TEXT,
    "occurredAt" DATE,
    "notes" TEXT,

    CONSTRAINT "ocular_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amendedAt" TIMESTAMP(3),

    CONSTRAINT "clinician_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examinations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eye" "Laterality" NOT NULL,
    "status" "ExaminationStatus" NOT NULL DEFAULT 'DRAFT',
    "examinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageSource" TEXT,
    "captureDevice" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eye_images" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "eye" "Laterality" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eye_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_quality_assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eyeImageId" TEXT NOT NULL,
    "modelVersionId" TEXT,
    "status" "ImageQualityStatus" NOT NULL,
    "reasonCodes" TEXT[],
    "score" DECIMAL(8,6),
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_quality_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "artifactSha256" TEXT NOT NULL,
    "task" "PredictionTask" NOT NULL,
    "artifactStorageKey" TEXT,
    "inputSpecification" JSONB NOT NULL,
    "outputLabels" JSONB NOT NULL,
    "labelOrderVerified" BOOLEAN NOT NULL DEFAULT false,
    "preprocessingSpecification" JSONB NOT NULL,
    "preprocessingVerified" BOOLEAN NOT NULL DEFAULT false,
    "decisionThresholds" JSONB,
    "calibrationMethod" TEXT,
    "validationDataset" TEXT,
    "validationMetrics" JSONB,
    "intendedUse" TEXT NOT NULL,
    "knownLimitations" JSONB NOT NULL,
    "deploymentStatus" "ModelDeploymentStatus" NOT NULL DEFAULT 'BLOCKED_PENDING_VALIDATION',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "eyeImageId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "task" "PredictionTask" NOT NULL,
    "status" "PredictionStatus" NOT NULL,
    "outcome" TEXT,
    "drGrade" TEXT,
    "rawOutput" JSONB,
    "confidence" DECIMAL(8,6),
    "uncertainty" DECIMAL(8,6),
    "inferenceTimeMs" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_probabilities" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelIndex" INTEGER NOT NULL,
    "rawScore" DECIMAL(12,8),
    "probability" DECIMAL(12,8),

    CONSTRAINT "prediction_probabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesion_findings" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "lesionType" TEXT NOT NULL,
    "score" DECIMAL(8,6),
    "geometry" JSONB,

    CONSTRAINT "lesion_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explainability_assets" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "methodVersion" TEXT,
    "storageKey" TEXT NOT NULL,
    "limitations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explainability_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_reviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "predictionId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "assessment" TEXT NOT NULL,
    "referralUrgency" "ReferralUrgency" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "referralReason" TEXT,
    "repeatImagingReason" TEXT,
    "signedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinician_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_amendments" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amendment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_diagnoses" (
    "id" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "reviewId" TEXT,
    "clinicianId" TEXT NOT NULL,
    "codeSystem" TEXT,
    "code" TEXT,
    "display" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinician_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "reviewId" TEXT,
    "urgency" "ReferralUrgency" NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'ACTIVE',
    "destination" TEXT,
    "reason" TEXT NOT NULL,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "examinationId" TEXT,
    "recordedById" TEXT NOT NULL,
    "treatmentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "examinationId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "carePlanId" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "appointmentType" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "conditionGroup" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "medicalReviewDate" DATE,
    "reviewedByDisplay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_sources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicationYear" INTEGER,
    "accessedAt" DATE NOT NULL,

    CONSTRAINT "medical_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_sources" (
    "articleVersionId" TEXT NOT NULL,
    "medicalSourceId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,

    CONSTRAINT "article_sources_pkey" PRIMARY KEY ("articleVersionId","medicalSourceId","sectionKey")
);

-- CreateTable
CREATE TABLE "medical_content_reviews" (
    "id" TEXT NOT NULL,
    "articleVersionId" TEXT NOT NULL,
    "reviewerDisplay" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "requestId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_oidcSubject_key" ON "users"("oidcSubject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE INDEX "organization_memberships_roleId_idx" ON "organization_memberships"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_roleId_key" ON "organization_memberships"("organizationId", "userId", "roleId");

-- CreateIndex
CREATE INDEX "patients_organizationId_status_idx" ON "patients"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "patients_organizationId_patientNumber_key" ON "patients"("organizationId", "patientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "patient_demographics_patientId_key" ON "patient_demographics"("patientId");

-- CreateIndex
CREATE INDEX "patient_demographics_familyName_givenName_idx" ON "patient_demographics"("familyName", "givenName");

-- CreateIndex
CREATE INDEX "patient_identifiers_patientId_idx" ON "patient_identifiers"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_identifiers_issuer_type_value_key" ON "patient_identifiers"("issuer", "type", "value");

-- CreateIndex
CREATE INDEX "patient_contacts_patientId_idx" ON "patient_contacts"("patientId");

-- CreateIndex
CREATE INDEX "consent_records_organizationId_patientId_purpose_status_idx" ON "consent_records"("organizationId", "patientId", "purpose", "status");

-- CreateIndex
CREATE INDEX "consent_records_capturedByUserId_idx" ON "consent_records"("capturedByUserId");

-- CreateIndex
CREATE INDEX "medical_histories_patientId_effectiveAt_idx" ON "medical_histories"("patientId", "effectiveAt");

-- CreateIndex
CREATE INDEX "medical_histories_recordedByUserId_idx" ON "medical_histories"("recordedByUserId");

-- CreateIndex
CREATE INDEX "risk_factors_patientId_code_observedAt_idx" ON "risk_factors"("patientId", "code", "observedAt");

-- CreateIndex
CREATE INDEX "clinical_measurements_organizationId_patientId_type_observe_idx" ON "clinical_measurements"("organizationId", "patientId", "type", "observedAt");

-- CreateIndex
CREATE INDEX "clinical_measurements_recordedByUserId_idx" ON "clinical_measurements"("recordedByUserId");

-- CreateIndex
CREATE INDEX "medications_patientId_idx" ON "medications"("patientId");

-- CreateIndex
CREATE INDEX "allergies_patientId_idx" ON "allergies"("patientId");

-- CreateIndex
CREATE INDEX "ocular_histories_patientId_eye_idx" ON "ocular_histories"("patientId", "eye");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_documents_storageKey_key" ON "clinical_documents"("storageKey");

-- CreateIndex
CREATE INDEX "clinical_documents_patientId_uploadedAt_idx" ON "clinical_documents"("patientId", "uploadedAt");

-- CreateIndex
CREATE INDEX "clinical_documents_uploadedByUserId_idx" ON "clinical_documents"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "clinician_notes_patientId_createdAt_idx" ON "clinician_notes"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "clinician_notes_authorId_idx" ON "clinician_notes"("authorId");

-- CreateIndex
CREATE INDEX "examinations_organizationId_patientId_eye_examinedAt_idx" ON "examinations"("organizationId", "patientId", "eye", "examinedAt");

-- CreateIndex
CREATE INDEX "examinations_createdByUserId_idx" ON "examinations"("createdByUserId");

-- CreateIndex
CREATE INDEX "eye_images_examinationId_eye_idx" ON "eye_images"("examinationId", "eye");

-- CreateIndex
CREATE INDEX "eye_images_organizationId_sha256_idx" ON "eye_images"("organizationId", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "eye_images_organizationId_storageKey_key" ON "eye_images"("organizationId", "storageKey");

-- CreateIndex
CREATE INDEX "image_quality_assessments_organizationId_status_assessedAt_idx" ON "image_quality_assessments"("organizationId", "status", "assessedAt");

-- CreateIndex
CREATE INDEX "image_quality_assessments_eyeImageId_idx" ON "image_quality_assessments"("eyeImageId");

-- CreateIndex
CREATE INDEX "image_quality_assessments_modelVersionId_idx" ON "image_quality_assessments"("modelVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_artifactSha256_key" ON "model_versions"("artifactSha256");

-- CreateIndex
CREATE INDEX "model_versions_task_deploymentStatus_idx" ON "model_versions"("task", "deploymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_modelKey_version_key" ON "model_versions"("modelKey", "version");

-- CreateIndex
CREATE INDEX "predictions_organizationId_examinationId_createdAt_idx" ON "predictions"("organizationId", "examinationId", "createdAt");

-- CreateIndex
CREATE INDEX "predictions_eyeImageId_idx" ON "predictions"("eyeImageId");

-- CreateIndex
CREATE INDEX "predictions_modelVersionId_idx" ON "predictions"("modelVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_probabilities_predictionId_labelIndex_key" ON "prediction_probabilities"("predictionId", "labelIndex");

-- CreateIndex
CREATE INDEX "lesion_findings_predictionId_idx" ON "lesion_findings"("predictionId");

-- CreateIndex
CREATE UNIQUE INDEX "explainability_assets_storageKey_key" ON "explainability_assets"("storageKey");

-- CreateIndex
CREATE INDEX "explainability_assets_predictionId_idx" ON "explainability_assets"("predictionId");

-- CreateIndex
CREATE INDEX "clinician_reviews_organizationId_signedAt_idx" ON "clinician_reviews"("organizationId", "signedAt");

-- CreateIndex
CREATE INDEX "clinician_reviews_examinationId_idx" ON "clinician_reviews"("examinationId");

-- CreateIndex
CREATE INDEX "clinician_reviews_predictionId_idx" ON "clinician_reviews"("predictionId");

-- CreateIndex
CREATE INDEX "clinician_reviews_reviewerId_idx" ON "clinician_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "review_amendments_reviewId_createdAt_idx" ON "review_amendments"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "review_amendments_authorId_idx" ON "review_amendments"("authorId");

-- CreateIndex
CREATE INDEX "clinician_diagnoses_examinationId_idx" ON "clinician_diagnoses"("examinationId");

-- CreateIndex
CREATE INDEX "clinician_diagnoses_reviewId_idx" ON "clinician_diagnoses"("reviewId");

-- CreateIndex
CREATE INDEX "clinician_diagnoses_clinicianId_idx" ON "clinician_diagnoses"("clinicianId");

-- CreateIndex
CREATE INDEX "referrals_organizationId_status_urgency_idx" ON "referrals"("organizationId", "status", "urgency");

-- CreateIndex
CREATE INDEX "referrals_patientId_idx" ON "referrals"("patientId");

-- CreateIndex
CREATE INDEX "referrals_examinationId_idx" ON "referrals"("examinationId");

-- CreateIndex
CREATE INDEX "referrals_reviewId_idx" ON "referrals"("reviewId");

-- CreateIndex
CREATE INDEX "treatments_patientId_performedAt_idx" ON "treatments"("patientId", "performedAt");

-- CreateIndex
CREATE INDEX "treatments_examinationId_idx" ON "treatments"("examinationId");

-- CreateIndex
CREATE INDEX "treatments_recordedById_idx" ON "treatments"("recordedById");

-- CreateIndex
CREATE INDEX "care_plans_organizationId_status_idx" ON "care_plans"("organizationId", "status");

-- CreateIndex
CREATE INDEX "care_plans_patientId_idx" ON "care_plans"("patientId");

-- CreateIndex
CREATE INDEX "care_plans_examinationId_idx" ON "care_plans"("examinationId");

-- CreateIndex
CREATE INDEX "care_plans_createdByUserId_idx" ON "care_plans"("createdByUserId");

-- CreateIndex
CREATE INDEX "follow_ups_organizationId_status_dueAt_idx" ON "follow_ups"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "follow_ups_patientId_idx" ON "follow_ups"("patientId");

-- CreateIndex
CREATE INDEX "follow_ups_carePlanId_idx" ON "follow_ups"("carePlanId");

-- CreateIndex
CREATE INDEX "appointments_organizationId_status_scheduledAt_idx" ON "appointments"("organizationId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "educational_articles_slug_key" ON "educational_articles"("slug");

-- CreateIndex
CREATE INDEX "educational_articles_conditionGroup_status_idx" ON "educational_articles"("conditionGroup", "status");

-- CreateIndex
CREATE UNIQUE INDEX "article_versions_articleId_version_key" ON "article_versions"("articleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "medical_sources_url_key" ON "medical_sources"("url");

-- CreateIndex
CREATE INDEX "article_sources_medicalSourceId_idx" ON "article_sources"("medicalSourceId");

-- CreateIndex
CREATE INDEX "medical_content_reviews_articleVersionId_reviewedAt_idx" ON "medical_content_reviews"("articleVersionId", "reviewedAt");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_resourceType_resourceId_occurre_idx" ON "audit_events"("organizationId", "resourceType", "resourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_occurredAt_idx" ON "audit_events"("actorUserId", "occurredAt");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_demographics" ADD CONSTRAINT "patient_demographics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_contacts" ADD CONSTRAINT "patient_contacts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_capturedByUserId_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_factors" ADD CONSTRAINT "risk_factors_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocular_histories" ADD CONSTRAINT "ocular_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_notes" ADD CONSTRAINT "clinician_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_notes" ADD CONSTRAINT "clinician_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_images" ADD CONSTRAINT "eye_images_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_images" ADD CONSTRAINT "eye_images_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_quality_assessments" ADD CONSTRAINT "image_quality_assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_quality_assessments" ADD CONSTRAINT "image_quality_assessments_eyeImageId_fkey" FOREIGN KEY ("eyeImageId") REFERENCES "eye_images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_quality_assessments" ADD CONSTRAINT "image_quality_assessments_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_eyeImageId_fkey" FOREIGN KEY ("eyeImageId") REFERENCES "eye_images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_probabilities" ADD CONSTRAINT "prediction_probabilities_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesion_findings" ADD CONSTRAINT "lesion_findings_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainability_assets" ADD CONSTRAINT "explainability_assets_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_reviews" ADD CONSTRAINT "clinician_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_reviews" ADD CONSTRAINT "clinician_reviews_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_reviews" ADD CONSTRAINT "clinician_reviews_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_reviews" ADD CONSTRAINT "clinician_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_amendments" ADD CONSTRAINT "review_amendments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "clinician_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_amendments" ADD CONSTRAINT "review_amendments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_diagnoses" ADD CONSTRAINT "clinician_diagnoses_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_diagnoses" ADD CONSTRAINT "clinician_diagnoses_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "clinician_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_diagnoses" ADD CONSTRAINT "clinician_diagnoses_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "clinician_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "educational_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_articleVersionId_fkey" FOREIGN KEY ("articleVersionId") REFERENCES "article_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_medicalSourceId_fkey" FOREIGN KEY ("medicalSourceId") REFERENCES "medical_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_content_reviews" ADD CONSTRAINT "medical_content_reviews_articleVersionId_fkey" FOREIGN KEY ("articleVersionId") REFERENCES "article_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
