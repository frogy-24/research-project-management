-- AddReportTemplate
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AddReportJob callRoundId & template fields
ALTER TABLE "ReportJob" ADD COLUMN "callRoundId" TEXT;
ALTER TABLE "ReportJob" ADD COLUMN "templateId" TEXT;
ALTER TABLE "ReportJob" ADD COLUMN "templateType" TEXT;
