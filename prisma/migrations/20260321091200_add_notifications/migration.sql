-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROJECT_STATUS_CHANGE', 'REGISTRATION_STATUS_CHANGE', 'PROGRESS_REPORT_SUBMITTED', 'PROGRESS_REPORT_REVIEWED', 'EXTENSION_REQUEST_SUBMITTED', 'EXTENSION_REQUEST_REVIEWED', 'CALL_ROUND_APPROVED', 'CALL_ROUND_REJECTED', 'INSTRUCTOR_ASSIGNED', 'DEAN_REVIEW_ASSIGNED', 'COUNCIL_EVALUATION_SUBMITTED', 'FUNDING_DISBURSED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
