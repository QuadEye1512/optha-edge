-- AlterTable
ALTER TABLE "follow_ups" ADD COLUMN     "examinationId" TEXT;

-- CreateIndex
CREATE INDEX "follow_ups_examinationId_idx" ON "follow_ups"("examinationId");

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
