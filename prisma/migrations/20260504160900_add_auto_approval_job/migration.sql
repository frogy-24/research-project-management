-- CreateEnum
CREATE TYPE "AutoApprovalJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AutoApprovalJob" (
    "id" TEXT NOT NULL,
    "deanId" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "criteria" JSONB NOT NULL,
    "status" "AutoApprovalJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutoApprovalJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoApprovalJob_deanId_status_idx" ON "AutoApprovalJob"("deanId", "status");

-- CreateIndex
CREATE INDEX "AutoApprovalJob_createdAt_idx" ON "AutoApprovalJob"("createdAt");

-- AddForeignKey
ALTER TABLE "AutoApprovalJob" ADD CONSTRAINT "AutoApprovalJob_deanId_fkey" FOREIGN KEY ("deanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
