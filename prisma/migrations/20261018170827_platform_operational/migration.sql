-- AlterTable
ALTER TABLE "clinician_reviews" ADD COLUMN     "confirmedGrade" INTEGER;

-- AlterTable
ALTER TABLE "eye_images" ADD COLUMN     "modelInputStorageKey" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "patient_education" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "gradeSource" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "generator" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_shares" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_education_organizationId_examinationId_createdAt_idx" ON "patient_education"("organizationId", "examinationId", "createdAt");

-- CreateIndex
CREATE INDEX "patient_education_patientId_idx" ON "patient_education"("patientId");

-- CreateIndex
CREATE INDEX "patient_education_createdByUserId_idx" ON "patient_education"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "report_shares_tokenHash_key" ON "report_shares"("tokenHash");

-- CreateIndex
CREATE INDEX "report_shares_organizationId_examinationId_idx" ON "report_shares"("organizationId", "examinationId");

-- CreateIndex
CREATE INDEX "report_shares_createdByUserId_idx" ON "report_shares"("createdByUserId");

-- AddForeignKey
ALTER TABLE "patient_education" ADD CONSTRAINT "patient_education_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_education" ADD CONSTRAINT "patient_education_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_education" ADD CONSTRAINT "patient_education_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_education" ADD CONSTRAINT "patient_education_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
