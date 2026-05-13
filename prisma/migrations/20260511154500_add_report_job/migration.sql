-- Migration: Add ReportJob model
-- Created: 2026-05-11

-- Create enum for ReportJobStatus if not exists
DO $$ BEGIN
    CREATE TYPE "ReportJobStatus" AS ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ReportJob table
CREATE TABLE IF NOT EXISTS "ReportJob" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT cuid(),
    "deanId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "templateUrl" TEXT,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "status" "ReportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "ReportJob_deanId_status_idx" ON "ReportJob"("deanId", "status");
CREATE INDEX IF NOT EXISTS "ReportJob_createdAt_idx" ON "ReportJob"("createdAt");

-- Add foreign key
ALTER TABLE "ReportJob" 
    ADD CONSTRAINT "ReportJob_deanId_fkey" 
    FOREIGN KEY ("deanId") 
    REFERENCES "User"("id") 
    ON DELETE CASCADE;
